var fs = require('fs')

var arithmeticCommands = [
    'add',
    'sub',
    'neg',
    'eq',
    'gt',
    'lt',
    'and',
    'or',
    'not'
]

var pushpopCommands = [
    'push',
    'pop'
]

basicLogicMap = {
    'SPDecrease': '@SP\nM=M-1\n',
    'SPIncrease': '@SP\nM=M+1\n',
    'SPPointerToD': '@SP\nA=M\nD=M\n',
    'SPPointerAddByD': '@SP\nA=M\nM=M+D\n',
    'SPPointerSubByD': '@SP\nA=M\nM=M-D\n',
    'SPPointerNeg': '@SP\nA=M\nM=-M\n',
    'EQUAL': '@EQUAL\nM;JEQ\n@SP\nA=M\nM=0\n(EQUAL)\n@SP\nA=M\nM=-1\n',
    'GREAT': '@GREAT\nM;JGT\n@SP\nA=M\nM=0\n(GREAT)\n@SP\nA=M\nM=-1\n',
    'LESS': '@LESS\nM;JLT\n@SP\nA=M\nM=0\n(LESS)\n@SP\nA=M\nM=-1\n',
    'ANDByD': '@SP\nA=M\nM=M&D\n',
    'ORByD': '@SP\nA=M\nM=M|D\n',
    'SPPointerNot': '@SP\nA=M\nM=!M\n'
}

vmCommandsMap = {
    'add': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerAddByD}${basicLogicMap.SPIncrease}`,
    'sub': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerSubByD}${basicLogicMap.SPIncrease}`,
    'neg': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerNeg}${basicLogicMap.SPIncrease}`,
    'eq': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerSubByD}${basicLogicMap.EQUAL}${basicLogicMap.SPIncrease}`,
    'gt': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerSubByD}${basicLogicMap.GREAT}${basicLogicMap.SPIncrease}`,
    'lt': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerSubByD}${basicLogicMap.LESS}${basicLogicMap.SPIncrease}`,
    'and': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.ANDByD}${basicLogicMap.SPIncrease}`,
    'or': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.ORByD}${basicLogicMap.SPIncrease}`,
    'not': `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerNot}${basicLogicMap.SPIncrease}`
}

segmentObj = {
    'local': 'LCL',
    'argument': 'ARG',
    'this': 'THIS',
    'that': 'THAT'
}

class Parser {
    constructor(inputfile) {
        let data = fs.readFileSync(inputfile, 'utf8')
        let lines = data.split('\n')
        let patt = /\s*\/\/.*/
        this.allCommands = lines
            .map(each => each.replace(patt, ''))
            .map(each => each.trim())
            .filter(each => !!each)
        this.currentCommand = null
        this.currentIndex = 0
        this.commandsLength = this.allCommands.length
        console.log('debug all commands: ', this.allCommands)
    }

    hasMoreCommands() {
        return this.currentIndex < this.commandsLength
    }

    advance() {
        this.currentCommand = this.allCommands[this.currentIndex]
        this.currentIndex += 1
        return this.currentCommand
    }
}

class codeWriter {
    constructor(inputfile, isFile) {
        let outputfile
        if (isFile) {
            outputfile = inputfile.replace('.vm', '.asm')
            this.filename = outputfile.split('/').slice(-1)[0].split('.')[0]
        } else {
            outputfile = `${inputfile}.asm`
            this.filename = outputfile.split('/').slice(-1)[0]
        }
        // let outputfile = inputfile.replace('.vm', '.asm')
        // this.filename = outputfile.split('/').slice(-1)[0].split('.')[0]
        fs.writeFileSync(outputfile, '') // remove the existing file
        this.funcName = ''
        this.callIndex = 0
        this.fd = fs.openSync(outputfile, 'a')
    }

    writeArithmetic(index, command) {
        let vmCommand = command[0]
        if (vmCommand === 'eq' || vmCommand === 'gt' || vmCommand === 'lt') {
            let temp = this._translateEQGTLT(index, vmCommand)
            fs.appendFileSync(this.fd, temp, 'utf8')
        } else {
            fs.appendFileSync(this.fd, vmCommandsMap[vmCommand], 'utf8')
        }
        console.log('asm arithmetic..\n', vmCommandsMap[vmCommand])
    }

    writePushPop(command) {
        console.log('push pop...')
        var result
        let [vmCommand, segment, index ] = command
        if (vmCommand === 'push') {
            if (segment === 'constant') {
                result = this._translatePushConstant(index)
            } else if (segment === 'local' || segment === 'argument' || segment === 'this' || segment === 'that') {
                result = this._translatePushLocal(segment, index)
            } else if (segment === 'temp') {
                result = this._translatePushTemp(segment, index)
            } else if (segment === 'pointer') {
                result = this._translatePushPointer(segment, index)
            } else if (segment === 'static') {
                result = this._translatePushStatic(this.filename, index)
            }
        } else if (vmCommand === 'pop') {
            if (segment === 'local' || segment === 'argument' || segment === 'this' || segment === 'that') {
                result = this._translatePopLocal(segment, index)
            } else if (segment === 'temp') {
                result = this._translatePopTemp(segment, index)
            } else if (segment === 'pointer') {
                result = this._translatePopPointer(segment, index)
            } else if (segment === 'static') {
                result = this._translatePopStatic(this.filename, index)
            }
        }
        console.log('asm pushpop...\n', result)
        fs.appendFileSync(this.fd, result, 'utf8')
    }

    writeLabel(command) {
        let [vmCommand, labelName] = command
        let labelVar = `(${this.filename}.${this.funcName}$${labelName})\n`
        fs.appendFileSync(this.fd, labelVar, 'utf8')
    }

    writeIf(command) {
        let [vmCommand, labelName]= command
        let labelVar = `${this.filename}.${this.funcName}$${labelName}`
        let result = `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}@${labelVar}\nD;JNE\n`
        fs.appendFileSync(this.fd, result, 'utf8')
    }

    writeGoto(command) {
        let [vmCommand, labelName] = command
        let labelVar = `${this.filename}.${this.funcName}$${labelName}`
        let result = `@${labelVar}\n0;JMP\n`
        fs.appendFileSync(this.fd, result, 'utf8')
    }

    writeFunction(command) {
        console.log('function...')
        let [vmCommand, fName, numVar] = command
        this._setCurrentFunctionName(fName)
        let fNameLabel = `${this.filename}.${fName}`
        let result = `
            (${fNameLabel})
            @i
            M=1 // i = 1
            (${fNameLabel}.fNameLocalLoop)
            @i
            D=M // D = i
            @${numVar}
            D=D-A // i - k
            @${fNameLabel}.fNameLocalLoopEnd
            D;JGT // i > k then jump to loop end
            @SP
            A=M
            M=0   // push 0
            @SP
            M=M+1 // sp++
            @i
            M=M+1 // i++ 
            @${fNameLabel}.fNameLocalLoop
            0;JMP
            (${fNameLabel}.fNameLocalLoopEnd)
        `
        fs.appendFileSync(this.fd, result, 'utf8')
    }

    writeReturn(command) {
        console.log('return...')
        this._setCurrentFunctionName('')
        this._resetCallIndex(0)
        let result = `
            @LCL 
            D=M
            @Frame
            M = D   // frame = lcl
            @5
            D=A
            @Frame
            A = M - D  // A = frame - 5
            D = M  // D = *(frame-5)
            @Ret 
            M=D  // RET = *(frame - 5)
            @SP
            M=M-1
            @SP
            A=M
            D=M    // D = pop()
            @ARG
            A=M
            M=D    // *ARG = pop()
            @ARG
            D=M+1  // ARG + 1
            @SP
            M=D    // sp = ARG + 1
            @1
            D=A
            @Frame
            A=M-D   // frame - 1
            D = M   // *(frame - 1)
            @THAT
            M=D     // THAT = *(frame-1)
            @2
            D=A
            @Frame
            A=M-D   // frame - 2
            D = M   // *(frame - 2)
            @THIS
            M=D     // THIS = *(frame-1)
            @3
            D=A
            @Frame
            A=M-D   // frame - 3
            D = M   // *(frame - 3)
            @ARG
            M=D     // ARG = *(frame-3)
            @4
            D=A
            @Frame
            A=M-D   // frame - 4
            D = M   // *(frame - 4)
            @LCL
            M=D     // LCL = *(frame-4)
            @Ret
            A=M
            0;JMP                                                                        
        `
        fs.appendFileSync(this.fd, result, 'utf8')
    }

    writeCall(command) {
        this._addCallIndex()
        let [vmCommand, fName, numArg] = command
        let returnAddr = `${this.filename}.${this.funcName}$ret.${this.callIndex}`
        let fNameLabel = `${this.filename}.${fName}`
        let result = `
            @${returnAddr}
            D=A    // D = returnAddr
            @SP
            A=M
            M=D    // push return-address
            @SP
            M=M+1  // sp++
            @LCL
            D=M    // D = LCL
            @SP
            A=M 
            M=D    // push lcl
            @SP
            M=M+1
            @ARG
            D=M    // D = ARG
            @SP
            A=M
            M=D    // push arg
            @SP
            M=M+1
            @THIS
            D=M    // D = THIS
            @SP
            A=M
            M=D    // push this
            @SP
            M=M+1
            @THAT
            D=M    // D = THAT
            @SP
            A=M
            M=D    // push that
            @SP
            M=M+1
            @5
            D=A
            @${numArg}
            D=D+A   // 5 + n
            @SP
            D=M-D   // SP - 5 - n
            @ARG
            M=D     // arg = sp - 5 -n
            @SP
            D=M
            @LCL
            M=D     // lcl = sp
            @${fNameLabel}
            0;JMP
            (${returnAddr})
        `
        console.log('writeCall...')
        fs.appendFileSync(this.fd, result, 'utf8')
    }

    writeInit() {
        // sp = 256
        let result = `
            @256
            D=A
            @SP
            M=D // sp = 256
        `
        fs.appendFileSync(this.fd, result, 'utf8')
        // call Sys.init
        this.writeCall(['call', 'Sys.init', '0'])
    }

    _addCallIndex() {
        this.callIndex = this.callIndex + 1
    }

    _resetCallIndex() {
        this.callIndex = 0
    }

    _setCurrentFunctionName(funcName) {
        this.funcName = funcName
    }

    _translatePushStatic(filename, index) {
        let varname = `${filename}.${index}`
        let result = `@${varname}\nD=M\n@SP\nA=M\nM=D\n${basicLogicMap.SPIncrease}`
        return result
    }

    _translatePopStatic(filename, index) {
        let varname = `${filename}.${index}`
        let result = `${basicLogicMap.SPDecrease}@SP\nA=M\nD=M\n@${varname}\nM=D\n`
        return result
    }

    _translatePushPointer(segment, index) {
        let pointer = Number(index) ? 'THAT' : 'THIS'
        let result = `@${pointer}\nD=M\n@SP\nA=M\nM=D\n${basicLogicMap.SPIncrease}`
        return result
    }

    _translatePopPointer(segment, index) {
        let pointer = Number(index) ? 'THAT' : 'THIS'
        let result = `${basicLogicMap.SPDecrease}@SP\nA=M\nD=M\n@${pointer}\nM=D\n`
        return result
    }

    _translatePopTemp(segment, index) {
        let addr = `@5\nD=A\n@${index}\nD=A+D\n@addr\nM=D\n`
        let result = `${addr}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}@addr\nA=M\nM=D\n`
        return result
    }

    _translatePushTemp(segment, index) {
        let addr = `@5\nD=A\n@${index}\nA=A+D\n`
        let result =`${addr}D=M\n@SP\nA=M\nM=D\n${basicLogicMap.SPIncrease}`
        return result
    }

    _translatePopLocal(segment, index) {
        let addr = `@${index}\nD=A\n@${segmentObj[segment]}\nD=M+D\n@addr\nM=D\n`
        let result = `${addr}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}@addr\nA=M\nM=D\n`
        return result
    }

    _translatePushLocal(segment, index) {
        let addr = `@${index}\nD=A\n@${segmentObj[segment]}\nA=M+D\n`
        let result =`${addr}D=M\n@SP\nA=M\nM=D\n${basicLogicMap.SPIncrease}`
        return result
    }

    _translateEQGTLT(index, vmCommand) {
        let label = `${vmCommand.toUpperCase()}${index}`
        let next = `next${index}`
        let jumpObj = {
            eq: 'JEQ',
            gt: 'JGT',
            lt: 'JLT'
        }
        let jump = `D=M\n@${label}\nD;${jumpObj[vmCommand]}\n@SP\nA=M\nM=0\n@${next}\n0;JMP\n(${label})\n@SP\nA=M\nM=-1\n(${next})\n`
        return `${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerToD}${basicLogicMap.SPDecrease}${basicLogicMap.SPPointerSubByD}${jump}${basicLogicMap.SPIncrease}`
    }

    _translatePushConstant(index) {
        let result = `@${index}\nD=A\n@SP\nA=M\nM=D\n${basicLogicMap.SPIncrease}`
        return result
    }

    close() {
        fs.closeSync(this.fd)
    }
}

function main() {
    let args = process.argv.slice(2)
    let inputFile = args[0]
    // handle file or directory
    let fileStats = fs.statSync(inputFile)
    let isFile = fileStats.isFile()
    console.log('is file', isFile)
    let inputFiles = isFile ? [inputFile] : fs.readdirSync(inputFile)
    console.log('input files', inputFiles)

    
    let codewriter = new codeWriter(inputFile, isFile)
    // handle the bootstrap code
    codewriter.writeInit()
    inputFiles.forEach((eachfile) => {
        let parser = new Parser(eachfile)
        while(parser.hasMoreCommands()) {
            let command = parser.advance()
            console.log(parser.currentIndex, command)
            let commandList = command.split(' ')
            if (arithmeticCommands.includes(commandList[0])) {
                codewriter.writeArithmetic(parser.currentIndex ,commandList)
            } else if (pushpopCommands.includes(commandList[0])) {
                codewriter.writePushPop(commandList)
            } else if (commandList[0] === 'label') {
                codewriter.writeLabel(commandList)
            } else if (commandList[0] === 'if-goto') {
                codewriter.writeIf(commandList)
            } else if (commandList[0] === 'goto') {
                codewriter.writeGoto(commandList)
            } else if (commandList[0] === 'function') {
                codewriter.writeFunction(commandList)
            } else if (commandList[0] === 'return') {
                codewriter.writeReturn(commandList)
            } else if (commandList[0] === 'call') {
                codewriter.writeCall(commandList)
            }
        }
    })

    codewriter.close()
}

main()