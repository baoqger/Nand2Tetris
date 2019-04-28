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
        var data = fs.readFileSync(inputfile, 'utf8')
        var lines = data.split('\n')
        this.allCommands = lines.filter(each => !each.includes('//')).filter(each => !!each)
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
    constructor(inputfile) {
        let outputfile = inputfile.replace('.vm', '.asm')
        fs.writeFileSync(outputfile, '') // remove the existing file
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
            }
        } else if (vmCommand === 'pop') {
            if (segment === 'local' || segment === 'argument' || segment === 'this' || segment === 'that') {
                result = this._translatePopLocal(segment, index)
            } else if (segment === 'temp') {
                result = this._translatePopTemp(segment, index)
            }
        }
        console.log('asm pushpop...\n', result)
        fs.appendFileSync(this.fd, result, 'utf8')
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
    let parser = new Parser(inputFile)
    let codewriter = new codeWriter(inputFile)

    while(parser.hasMoreCommands()) {
        let command = parser.advance()
        console.log(parser.currentIndex, command)
        let commandList = command.split(' ')
        if (arithmeticCommands.includes(commandList[0])) {
            codewriter.writeArithmetic(parser.currentIndex ,commandList)
        } else if (pushpopCommands.includes(commandList[0])) {
            codewriter.writePushPop(commandList)
        }

    }

    codewriter.close()
}

main()