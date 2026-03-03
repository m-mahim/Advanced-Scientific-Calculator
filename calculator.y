%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

#define SYMBOL_TABLE_SIZE 100

#ifndef M_PI
#define M_PI 3.14159265358979323846
#endif

#ifndef M_E
#define M_E 2.71828182845904523536
#endif

typedef struct {
    char name[32];
    double value;
} Symbol;

Symbol symbolTable[SYMBOL_TABLE_SIZE];
int symbolCount = 0;

double getVariable(char *name);
void setVariable(char *name, double value);
void showHelp();
void showVariables();
void listFunctions();
int yylex(void);
void yyerror(const char *s);
int yyparse(void);

int degree_mode = 0; // 0 for radian, 1 for degree
%}

%union {
    double num;
    char *str;
}

%token <num> NUMBER CONSTANT_PI CONSTANT_E
%token <str> IDENTIFIER
%token SIN COS TAN LOG LN SQRT EXP ABS POW
%token INT DEG RAD MOD INV ROUND CEIL FLOOR
%token INCREMENT DECREMENT
%token PLUS MINUS MULTIPLY DIVIDE POWER FACTORIAL MODULUS
%token LPAREN RPAREN COMMA ASSIGN
%token QUIT CLEAR HELP VARS LIST
%token EOL

%type <num> expression term factor power factorial primary function_call const_expr

%right ASSIGN
%left PLUS MINUS
%left MULTIPLY DIVIDE MODULUS
%right POWER
%left FACTORIAL
%right UMINUS

%%

input: 
    | input line
    ;

line: 
      EOL                 { printf(">>> "); }
    | expression EOL      { printf("= %g\n>>> ", $1); }
    | assignment EOL      { printf(">>> "); }
    | command EOL         { /* commands handle their own prompts */ }
    | error EOL           { yyerrok; printf(">>> "); }
    ;

assignment:
    IDENTIFIER ASSIGN expression { 
        setVariable($1, $3); 
        printf("%s = %g\n", $1, $3);
        free($1);
    }
    ;

command:
    QUIT            { printf("Goodbye!\n"); exit(0); }
    | CLEAR         { system("clear"); printf("Scientific Calculator Cleared!\n"); }
    | HELP          { showHelp(); }
    | VARS          { showVariables(); }
    | LIST          { listFunctions(); }
    | DEG           { degree_mode = 1; printf("Switched to DEGREE mode\n"); }
    | RAD           { degree_mode = 0; printf("Switched to RADIAN mode\n"); }
    ;

expression: 
      term                    { $$ = $1; }
    | expression PLUS term    { $$ = $1 + $3; }
    | expression MINUS term   { $$ = $1 - $3; }
    | expression MODULUS term { 
          if((int)$3 == 0) {
              yyerror("Modulus by zero");
              $$ = 0;
          } else {
              $$ = (int)$1 % (int)$3;
          }
      }
    ;

term: 
      factor                    { $$ = $1; }
    | term MULTIPLY factor      { $$ = $1 * $3; }
    | term DIVIDE factor        { 
          if($3 == 0) {
              yyerror("Division by zero");
              $$ = 0;
          } else {
              $$ = $1 / $3;
          }
      }
    ;

factor:
      power                     { $$ = $1; }
    | MINUS factor %prec UMINUS { $$ = -$2; }
    | PLUS factor %prec UMINUS  { $$ = $2; }
    ;

power:
      factorial                 { $$ = $1; }
    | factorial POWER power     { $$ = pow($1, $3); }
    | POWER factorial           { yyerror("Missing left operand for power"); $$ = 0; }
    ;

factorial:
      primary                   { $$ = $1; }
    | primary FACTORIAL         { 
          if($1 < 0 || $1 != (int)$1) {
              yyerror("Factorial requires non-negative integer");
              $$ = 0;
          } else {
              double result = 1;
              for(int i = 2; i <= (int)$1; i++) {
                  result *= i;
              }
              $$ = result;
          }
      }
    ;

primary:
      NUMBER                    { $$ = $1; }
    | CONSTANT_PI               { $$ = M_PI; }
    | CONSTANT_E                { $$ = M_E; }
    | IDENTIFIER                { $$ = getVariable($1); free($1); }
    | LPAREN expression RPAREN  { $$ = $2; }
    | function_call             { $$ = $1; }
    | const_expr                { $$ = $1; }
    ;

const_expr:
      CONSTANT_PI ASSIGN        { printf("pi = %.15g\n", M_PI); $$ = M_PI; }
    | CONSTANT_E ASSIGN         { printf("e = %.15g\n", M_E); $$ = M_E; }
    ;

function_call:
      SIN LPAREN expression RPAREN     { 
          double angle = degree_mode ? ($3 * M_PI / 180.0) : $3;
          $$ = sin(angle); 
      }
    | COS LPAREN expression RPAREN     { 
          double angle = degree_mode ? ($3 * M_PI / 180.0) : $3;
          $$ = cos(angle); 
      }
    | TAN LPAREN expression RPAREN     { 
          double angle = degree_mode ? ($3 * M_PI / 180.0) : $3;
          $$ = tan(angle); 
      }
    | LOG LPAREN expression RPAREN     { 
          if($3 <= 0) {
              yyerror("Log domain error: must be positive");
              $$ = 0;
          } else {
              $$ = log10($3);
          }
      }
    | LN LPAREN expression RPAREN      { 
          if($3 <= 0) {
              yyerror("Natural log domain error: must be positive");
              $$ = 0;
          } else {
              $$ = log($3);
          }
      }
    | SQRT LPAREN expression RPAREN    { 
          if($3 < 0) {
              yyerror("Square root domain error: must be non-negative");
              $$ = 0;
          } else {
              $$ = sqrt($3);
          }
      }
    | EXP LPAREN expression RPAREN     { $$ = exp($3); }
    | ABS LPAREN expression RPAREN     { $$ = fabs($3); }
    | POW LPAREN expression COMMA expression RPAREN { $$ = pow($3, $5); }
    | INT LPAREN expression RPAREN     { $$ = (int)$3; }
    | MOD LPAREN expression COMMA expression RPAREN { 
          if((int)$5 == 0) {
              yyerror("Modulus by zero");
              $$ = 0;
          } else {
              $$ = (int)$3 % (int)$5;
          }
      }
    | INV LPAREN expression RPAREN     { 
          if($3 == 0) {
              yyerror("Division by zero in inverse");
              $$ = 0;
          } else {
              $$ = 1.0 / $3;
          }
      }
    | ROUND LPAREN expression RPAREN   { $$ = round($3); }
    | CEIL LPAREN expression RPAREN    { $$ = ceil($3); }
    | FLOOR LPAREN expression RPAREN   { $$ = floor($3); }
    | INCREMENT LPAREN expression RPAREN   { $$ = $3 + 1; }
    | DECREMENT LPAREN expression RPAREN   { $$ = $3 - 1; }
    ;

%%

double getVariable(char *name) {
    for(int i = 0; i < symbolCount; i++) {
        if(strcmp(symbolTable[i].name, name) == 0) {
            return symbolTable[i].value;
        }
    }
    printf("Warning: Variable '%s' not found, using 0\n", name);
    return 0;
}

void setVariable(char *name, double value) {
    for(int i = 0; i < symbolCount; i++) {
        if(strcmp(symbolTable[i].name, name) == 0) {
            symbolTable[i].value = value;
            return;
        }
    }
    
    if(symbolCount < SYMBOL_TABLE_SIZE) {
        strcpy(symbolTable[symbolCount].name, name);
        symbolTable[symbolCount].value = value;
        symbolCount++;
    } else {
        printf("Error: Symbol table full\n");
    }
}

void showVariables() {
    printf("\n=== STORED VARIABLES ===\n");
    if(symbolCount == 0) {
        printf("No variables stored\n");
    } else {
        for(int i = 0; i < symbolCount; i++) {
            printf("%s = %g\n", symbolTable[i].name, symbolTable[i].value);
        }
    }
}

void listFunctions() {
    printf("\n=== AVAILABLE FUNCTIONS ===\n");
    printf("Basic: +, -, *, /, %%, ^, !\n");
    printf("Trigonometric: sin, cos, tan (use DEG/RAD to switch mode)\n");
    printf("Logarithmic: log (base 10), ln (natural)\n");
    printf("Exponential: exp, pow(x,y)\n");
    printf("Other: sqrt, abs, int, mod(x,y), inv, round, ceil, floor\n");
    printf("New: inc(x) [increment], dec(x) [decrement]\n");
    printf("Constants: pi, e (type 'pi=' or 'e=' to see values)\n");
    printf("Commands: help, vars, list, clear, quit, deg, rad\n");
}

void showHelp() {
    printf("\n=== SCIENTIFIC CALCULATOR HELP ===\n");
    printf("Type mathematical expressions or use functions:\n");
    printf("Examples:\n");
    printf("  2 + 3 * 4\n");
    printf("  sin(90)        [In DEGREE mode]\n");
    printf("  sin(pi/2)      [In RADIAN mode]\n");
    printf("  x = 5\n");
    printf("  pow(2, 8)\n");
    printf("  5! + 10\n");
    printf("  mod(17, 5)     [Remainder]\n");
    printf("  int(3.14)      [Integer part]\n");
    printf("  inv(5)         [1/5 = 0.2]\n");
    printf("  round(3.6)     [Rounds to 4]\n");
    printf("  inc(5)         [5+1 = 6]\n");
    printf("  dec(5)         [5-1 = 4]\n");
    printf("  pi=            [Show pi value]\n");
    printf("  e=             [Show e value]\n");
    printf("\nUse 'list' to see all functions\n");
    printf("Use 'vars' to see stored variables\n");
    printf("Use 'deg' or 'rad' to switch angle mode\n");
}

void yyerror(const char *s) {
    fprintf(stderr, "Error: %s\n", s);
}

int main() {
    // Initialize predefined constants
    setVariable("pi", M_PI);
    setVariable("e", M_E);
    
    printf("=== ADVANCED SCIENTIFIC CALCULATOR ===\n");
    printf("Type 'help' for instructions\n");
    printf("Type 'list' for function list\n");
    printf("Type 'quit' to exit\n");
    printf("Current mode: %s\n\n", degree_mode ? "DEGREE" : "RADIAN");
    printf(">>> ");
    
    yyparse();
    
    return 0;
}