// Program: Rectangle.asm
// Draws a filled rectangle at the
// screen's top left corner, with
// width of 16 pixels and height of
// RAM[0] pixels.
// Usage: put a non-negative number
// (rectangle's height) in RAM[0].
(LOOP)
@SCREEN
D=A
@scr
M=D      // scr = SCREEN
@KBD
D=A
@kbd
M=D      // kbd = KBD

@KBD
D=M
@BLACK
D;JNE
@WHITE
D;JEQ

@LOOP
0;JMP 

(BLACK)
@scr
D=M
@kbd
D=D-M
@LOOP
D;JGE // if scr >= kbd goto LOOP

@scr
A=M
M=-1      // RAM[src]=11111111

@scr
M=M+1
@BLACK
0;JMP

(WHITE)
@scr
D=M
@kbd
D=D-M
@LOOP
D;JGE // if scr >= kbd goto LOOP

@scr
A=M
M=0      // RAM[src]=00000000

@scr
M=M+1
@WHITE
0;JMP

