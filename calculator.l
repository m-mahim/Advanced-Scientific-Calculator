%{
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>
#include "calculator.tab.h"

void showError(char *msg);
%}

DIGIT    [0-9]
ID       [a-zA-Z_][a-zA-Z0-9_]*
WS       [ \t]

%%

{DIGIT}+          { yylval.num = atof(yytext); return NUMBER; }
{DIGIT}+"."{DIGIT}*  { yylval.num = atof(yytext); return NUMBER; }
{DIGIT}*"."{DIGIT}+  { yylval.num = atof(yytext); return NUMBER; }

"sin"             { return SIN; }
"cos"             { return COS; }
"tan"             { return TAN; }
"log"             { return LOG; }
"ln"              { return LN; }
"sqrt"            { return SQRT; }
"exp"             { return EXP; }
"abs"             { return ABS; }
"pow"             { return POW; }
"int"|"INT"       { return INT; }
"deg"|"DEG"       { return DEG; }
"rad"|"RAD"       { return RAD; }
"mod"|"MOD"       { return MOD; }
"inv"|"INV"       { return INV; }
"round"           { return ROUND; }
"ceil"            { return CEIL; }
"floor"           { return FLOOR; }
"inc"|"INC"       { return INCREMENT; }
"dec"|"DEC"       { return DECREMENT; }

"pi"              { yylval.num = M_PI; return CONSTANT_PI; }
"e"               { yylval.num = M_E; return CONSTANT_E; }

"+"               { return PLUS; }
"-"               { return MINUS; }
"*"               { return MULTIPLY; }
"/"               { return DIVIDE; }
"^"               { return POWER; }
"!"               { return FACTORIAL; }
"%"               { return MODULUS; }

"("               { return LPAREN; }
")"               { return RPAREN; }
","               { return COMMA; }
"="               { return ASSIGN; }

"quit"|"exit"     { return QUIT; }
"clear"|"cls"     { return CLEAR; }
"help"            { return HELP; }
"vars"            { return VARS; }
"list"            { return LIST; }

\n                { return EOL; }
{ID}              { yylval.str = strdup(yytext); return IDENTIFIER; }
{WS}              { /* ignore whitespace */ }
.                 { showError("Invalid character"); return EOL; }

%%

void showError(char *msg) {
    printf("Error: %s at '%s'\n", msg, yytext);
}

int yywrap() {
    return 1;
}