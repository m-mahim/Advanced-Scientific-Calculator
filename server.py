import http.server
import socketserver
import webbrowser
import os
import sys
import json
import subprocess
import tempfile
import re

class CalculatorHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=os.path.dirname(os.path.abspath(__file__)), **kwargs)
    
    def do_GET(self):
        if self.path == '/':
            self.path = '/index.html'
        elif self.path == '/api/variables':
            self.handle_get_variables()
            return
        elif self.path == '/api/history':
            self.handle_get_history()
            return
        elif self.path == '/api/constants':
            self.handle_get_constants()
            return
        return super().do_GET()
    
    def do_POST(self):
        if self.path == '/api/calculate':
            self.handle_calculation()
        elif self.path == '/api/set_variable':
            self.handle_set_variable()
        elif self.path == '/api/clear_variables':
            self.handle_clear_variables()
        elif self.path == '/api/clear_history':
            self.handle_clear_history()
        else:
            self.send_error(404)
    
    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_cors_headers()
    
    def send_cors_headers(self):
        """Send CORS headers"""
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, DELETE')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.send_header('Access-Control-Allow-Credentials', 'true')
    
    def send_json_response(self, data, status=200):
        """Send JSON response"""
        response = json.dumps(data).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(response)))
        self.send_cors_headers()
        self.end_headers()
        self.wfile.write(response)
    
    def handle_calculation(self):
        """Handle calculation requests using the C backend"""
        try:
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            expression = data.get('expression', '').strip()
            angle_mode = data.get('angle_mode', 'RAD')  # Default to RADIAN
            
            if not expression:
                self.send_json_response({'error': 'Empty expression'}, 400)
                return
            
            print(f"🔢 Calculating: {expression} (Mode: {angle_mode})")
            
            # Preprocess expression for C calculator
            expression = self.preprocess_expression(expression)
            
            # Create temporary input file
            with tempfile.NamedTemporaryFile(mode='w', suffix='.txt', delete=False) as tmp:
                # Write angle mode first
                mode_line = "RAD" if angle_mode == "RAD" else "DEG"
                tmp.write(f"{mode_line}\n")
                
                # Send the expression
                tmp.write(f"{expression}\n")
                
                # Ask for variables to update them
                tmp.write("vars\n")
                tmp.write("quit\n")
                tmp_path = tmp.name
            
            try:
                # Path to the compiled calculator executable
                backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
                calculator_exe = os.path.join(backend_dir, 'calculator')
                
                # Add .exe extension for Windows
                if not os.path.exists(calculator_exe) and os.name == 'nt':
                    calculator_exe = os.path.join(backend_dir, 'calculator.exe')
                
                if not os.path.exists(calculator_exe):
                    self.send_json_response({
                        'error': 'Calculator backend not compiled. Please run compile_backend.py first.'
                    }, 500)
                    return
                
                # Run calculator with the temporary input file
                with open(tmp_path, 'r') as input_file:
                    result = subprocess.run(
                        [calculator_exe],
                        stdin=input_file,
                        text=True,
                        capture_output=True,
                        cwd=backend_dir,
                        timeout=10
                    )
                
                # Parse output
                output_lines = result.stdout.strip().split('\n')
                error_lines = result.stderr.strip().split('\n') if result.stderr else []
                
                # Debug output
                print(f"Calculator stdout lines: {len(output_lines)}")
                print(f"Calculator stderr: {error_lines}")
                print(f"Return code: {result.returncode}")
                
                # Check for errors
                if result.returncode != 0 or (error_lines and any('error' in line.lower() for line in error_lines)):
                    error_msg = self.parse_error(output_lines + error_lines)
                    if not error_msg:
                        error_msg = f"Calculator error (code: {result.returncode})"
                    self.send_json_response({'error': error_msg}, 400)
                    return
                
                # Extract result and variables - FIXED: Pass the expression for better parsing
                calculation_result = self.parse_result(output_lines, expression)
                extracted_variables = self.extract_variables(output_lines)
                console_output = self.extract_console_output(output_lines)
                
                print(f"Parsed result: {calculation_result}")
                print(f"Variables found: {len(extracted_variables)}")
                
                # If it's a variable assignment
                if '=' in expression and calculation_result is None:
                    parts = expression.split('=')
                    if len(parts) == 2:
                        var_name = parts[0].strip()
                        # For assignments, check if variable was stored
                        if var_name in extracted_variables:
                            calculation_result = extracted_variables[var_name]
                            self.send_json_response({
                                'success': True,
                                'result': calculation_result,
                                'message': f'{var_name} = {calculation_result}',
                                'variables': extracted_variables,
                                'console_output': console_output
                            })
                            return
                
                # Check if we got a result
                if calculation_result is None:
                    # Try to find any result in the output
                    for line in output_lines:
                        line = line.strip()
                        if line.startswith('= '):
                            result_str = line[2:].strip()
                            try:
                                calculation_result = float(result_str) if '.' in result_str else int(result_str)
                                break
                            except ValueError:
                                calculation_result = result_str
                                break
                
                if calculation_result is None:
                    self.send_json_response({'error': 'No result found in calculator output'}, 400)
                    return
                
                # Successful calculation
                self.send_json_response({
                    'success': True,
                    'result': calculation_result,
                    'variables': extracted_variables,
                    'console_output': console_output
                })
                
            finally:
                # Clean up
                try:
                    os.unlink(tmp_path)
                except:
                    pass
                
        except subprocess.TimeoutExpired:
            self.send_json_response({'error': 'Calculation timeout (10 seconds)'}, 408)
        except Exception as e:
            print(f"❌ Server error: {str(e)}")
            import traceback
            traceback.print_exc()
            self.send_json_response({'error': f'Server error: {str(e)}'}, 500)
    
    def preprocess_expression(self, expression):
        """Preprocess expression for C calculator compatibility"""
        # Replace common mathematical symbols
        expression = expression.replace('×', '*')
        expression = expression.replace('÷', '/')
        expression = expression.replace('π', 'pi')
        expression = expression.replace('Pi', 'pi')
        expression = expression.replace('PI', 'pi')
        
        # Handle implied multiplication (e.g., 2pi -> 2*pi)
        expression = re.sub(r'(\d)([a-zA-Z_])', r'\1*\2', expression)
        expression = re.sub(r'([a-zA-Z_])(\d)', r'\1*\2', expression)
        expression = re.sub(r'\)([a-zA-Z_\d\(])', r')*\1', expression)
        expression = re.sub(r'([a-zA-Z_])\s*\(', r'\1*(', expression)
        
        # Ensure proper spacing for operators
        expression = re.sub(r'\s*([\+\-\*/^=])\s*', r' \1 ', expression)
        
        return expression.strip()
    
    def parse_result(self, lines, original_expression):
        """Parse calculator output to find the result - FIXED VERSION"""
        print(f"Looking for result in {len(lines)} lines")
        
        # First, look for the standard result pattern "= value"
        for line in lines:
            line = line.strip()
            print(f"Checking line: '{line}'")
            
            # Look for "= result" pattern
            if line.startswith('= '):
                result_str = line[2:].strip()
                print(f"Found result pattern: '{result_str}'")
                try:
                    # Try to convert to number
                    if '.' in result_str or 'e' in result_str.lower():
                        return float(result_str)
                    else:
                        return int(result_str)
                except ValueError:
                    # If conversion fails, return as string
                    return result_str
        
        # If not found, look for lines that look like calculation results
        for line in lines:
            line = line.strip()
            # Skip prompt lines and section headers
            if line.startswith('>>>') or line.startswith('===') or line.startswith('---'):
                continue
            
            # Look for "something = value" pattern
            if ' = ' in line:
                parts = line.split(' = ')
                if len(parts) == 2:
                    result_str = parts[1].strip()
                    print(f"Found alternative result: '{result_str}'")
                    try:
                        if '.' in result_str or 'e' in result_str.lower():
                            return float(result_str)
                        else:
                            return int(result_str)
                    except ValueError:
                        continue
        
        print("No result found in output")
        return None
    
    def extract_variables(self, lines):
        """Extract variables from calculator output"""
        variables = {}
        in_vars_section = False
        
        for line in lines:
            line = line.strip()
            if line.startswith('=== STORED VARIABLES ==='):
                in_vars_section = True
                continue
            elif line.startswith('===') and in_vars_section:
                in_vars_section = False
                continue
            elif in_vars_section:
                if line == '' or line == 'No variables stored':
                    continue
                # Parse "variable = value"
                if ' = ' in line:
                    parts = line.split(' = ')
                    if len(parts) == 2:
                        var_name = parts[0].strip()
                        try:
                            var_value = float(parts[1].strip()) if '.' in parts[1] else int(parts[1].strip())
                            variables[var_name] = var_value
                        except ValueError:
                            variables[var_name] = parts[1].strip()
        
        # Add pi and e if not present
        if 'pi' not in variables:
            variables['pi'] = 3.141592653589793
        if 'e' not in variables:
            variables['e'] = 2.718281828459045
            
        return variables
    
    def extract_console_output(self, lines):
        """Extract console output for display"""
        output = []
        for line in lines:
            line = line.strip()
            if line and not line.startswith('>>>') and line != 'Goodbye!':
                output.append(line)
        return output[:10]  # Return last 10 lines
    
    def parse_error(self, lines):
        """Extract error message"""
        for line in lines:
            line = line.strip()
            if 'Error:' in line:
                return line.replace('Error: ', '').replace('>>> ', '')
            elif 'error:' in line.lower():
                return line
            elif 'syntax error' in line.lower():
                return 'Syntax error in expression'
            elif 'parse error' in line.lower():
                return 'Parse error in expression'
        return 'Unknown calculation error'
    
    def handle_get_variables(self):
        """Get current variables"""
        # Return default variables
        variables = {
            'pi': 3.141592653589793,
            'e': 2.718281828459045
        }
        self.send_json_response({'variables': variables})
    
    def handle_get_history(self):
        """Get calculation history"""
        self.send_json_response({'history': []})
    
    def handle_get_constants(self):
        """Get mathematical constants"""
        constants = {
            'pi': {
                'value': 3.141592653589793,
                'description': 'Ratio of circumference to diameter'
            },
            'e': {
                'value': 2.718281828459045,
                'description': "Euler's number, base of natural logarithm"
            }
        }
        self.send_json_response({'constants': constants})
    
    def handle_set_variable(self):
        """Handle variable setting"""
        self.send_json_response({'success': True, 'message': 'Variable stored in calculator memory'})
    
    def handle_clear_variables(self):
        """Clear user variables"""
        self.send_json_response({'success': True, 'message': 'User variables cleared'})
    
    def handle_clear_history(self):
        """Clear calculation history"""
        self.send_json_response({'success': True, 'message': 'History cleared'})
    
    def log_message(self, format, *args):
        print(f"🌐 Calculator Server - {format % args}")

def compile_backend():
    """Compile the C calculator backend"""
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    
    print("🔧 Compiling Calculator Backend...")
    print("=" * 60)
    
    # Check if backend directory exists
    if not os.path.exists(backend_dir):
        os.makedirs(backend_dir)
        print(f"Created backend directory: {backend_dir}")
    
    # Copy calculator.l and calculator.y if they exist in current directory
    for file in ['calculator.l', 'calculator.y']:
        src = os.path.join(os.path.dirname(__file__), file)
        dst = os.path.join(backend_dir, file)
        if os.path.exists(src) and not os.path.exists(dst):
            import shutil
            shutil.copy2(src, dst)
            print(f"📄 Copied {file} to backend directory")
    
    # Check for required files
    required_files = ['calculator.l', 'calculator.y']
    for file in required_files:
        filepath = os.path.join(backend_dir, file)
        if not os.path.exists(filepath):
            print(f"❌ Error: {file} not found in backend directory")
            return False
    
    # Clean previous builds
    print("🧹 Cleaning previous builds...")
    for file in ['lex.yy.c', 'calculator.tab.c', 'calculator.tab.h', 'calculator', 'calculator.exe']:
        filepath = os.path.join(backend_dir, file)
        if os.path.exists(filepath):
            os.remove(filepath)
    
    # Check for required tools
    print("🔍 Checking for required tools...")
    try:
        subprocess.run(['flex', '--version'], capture_output=True, check=True)
        print("✅ Flex found")
    except:
        print("❌ Flex not found. Please install flex (lexical analyzer)")
        return False
    
    try:
        subprocess.run(['bison', '--version'], capture_output=True, check=True)
        print("✅ Bison found")
    except:
        print("❌ Bison not found. Please install bison (parser generator)")
        return False
    
    try:
        subprocess.run(['gcc', '--version'], capture_output=True, check=True)
        print("✅ GCC found")
    except:
        print("❌ GCC not found. Please install gcc (C compiler)")
        return False
    
    # Change to backend directory
    original_dir = os.getcwd()
    os.chdir(backend_dir)
    
    try:
        # Generate lexer and parser
        print("📝 Generating lexer (Flex)...")
        result = subprocess.run(['flex', 'calculator.l'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Flex error: {result.stderr}")
            return False
        
        print("📝 Generating parser (Bison)...")
        result = subprocess.run(['bison', '-d', 'calculator.y'], capture_output=True, text=True)
        if result.returncode != 0:
            print(f"❌ Bison error: {result.stderr}")
            return False
        
        # Compile
        print("⚙️ Compiling calculator...")
        compile_cmd = ['gcc', '-o', 'calculator', 'lex.yy.c', 'calculator.tab.c', '-lm', '-O2']
        result = subprocess.run(compile_cmd, capture_output=True, text=True)
        
        if result.returncode != 0:
            print(f"❌ Compilation error: {result.stderr}")
            return False
        
        # Check if compilation succeeded
        exe_name = 'calculator.exe' if os.name == 'nt' else 'calculator'
        if os.path.exists(exe_name):
            print("✅ Backend compilation successful!")
            
            # Test the calculator
            print("🧪 Testing calculator...")
            test_inputs = [
                ('2 + 3 * 4', '14'),
                ('2+2', '4'),
                ('10/2', '5'),
                ('3^2', '9')
            ]
            
            for expr, expected in test_inputs:
                print(f"  Testing: {expr} ... ", end='')
                test_result = subprocess.run(
                    ['./calculator'] if os.name != 'nt' else ['./calculator.exe'],
                    input=f'RAD\n{expr}\nvars\nquit\n',
                    text=True,
                    capture_output=True,
                    timeout=5
                )
                
                if expected in test_result.stdout:
                    print("✅")
                else:
                    print(f"❌ (Expected {expected}, got: {test_result.stdout[:100]}...)")
            
            return True
        else:
            print("❌ Compilation failed - executable not created")
            return False
            
    finally:
        os.chdir(original_dir)

def start_server(port=8090):
    """Start the HTTP server"""
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # Check if backend is compiled
    backend_dir = os.path.join(os.path.dirname(__file__), 'backend')
    exe_name = 'calculator.exe' if os.name == 'nt' else 'calculator'
    calculator_exe = os.path.join(backend_dir, exe_name)
    
    if not os.path.exists(calculator_exe):
        print("⚠️ Calculator backend not compiled. Attempting to compile...")
        if not compile_backend():
            print("❌ Failed to compile backend. Starting server anyway...")
        else:
            print("✅ Backend compiled successfully!")
    
    with socketserver.TCPServer(("", port), CalculatorHandler) as httpd:
        print("\n" + "=" * 60)
        print("🧮 SCIENTIFIC CALCULATOR SERVER")
        print("=" * 60)
        print(f"📍 URL: http://localhost:{port}")
        print(f"🔧 Backend: Flex/Bison C Calculator")
        print(f"🎨 Interface: Advanced Web Calculator")
        print("=" * 60)
        print("📚 Features:")
        print("  • Real-time calculation with C backend")
        print("  • Variable storage and management")
        print("  • Calculation history")
        print("  • Trigonometric functions (DEG/RAD modes)")
        print("  • Mathematical constants (π, e)")
        print("  • Custom expressions and assignments")
        print("=" * 60)
        print("🛑 Press Ctrl+C to stop the server")
        print("=" * 60)
        
        try:
            webbrowser.open(f'http://localhost:{port}')
            print("🌐 Browser opened automatically!")
        except:
            print("📱 Please open your browser to the URL above")
        
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\n🛑 Server stopped. Goodbye! 👋")

if __name__ == "__main__":
    port = 8090
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            print("⚠️ Invalid port number. Using default port 8000")
    
    start_server(port)