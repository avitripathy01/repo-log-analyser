const fs = require('fs');
const { exec } = require('child_process');
const readline = require("readline");
const path = require('path'); 

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stderr
});

const executeProcess = (command, outPutFileName, message) => {
    const fileStream = outPutFileName ? fs.createWriteStream(outPutFileName) : null;
    let execProcess = '';
    return new Promise((resolve, reject) => {
        try {
            execProcess = exec(command);
            if (fileStream) {
                console.log(`Processing ${message.commandName} for file  ${path.basename(message.fileName)} in directory '${path.dirname(message.fileName)}' ::`);
                execProcess.stdout.pipe(fileStream);
                execProcess.stdout.on('close', () => {
                    console.log(`${message.success}`);
                });
            } else
                execProcess.stdout.on('data', (data) => {
                    console.log(`${message.success} in directory '${path.dirname(message.fileName)}' ${data}`);
                });
            resolve();
        } catch (error) {
            execProcess.stdout.on('error', (err) => {
                console.log(`${err}`);
            });
            reject();
        }
    });

}

const displayTopNRequest = (file) => {
    const dirName = getParentDirectoryName(file) !== '' ? getParentDirectoryName(file) + '-' : '';
    const topNComand = `awk '{if(/- +/) print $(NF-1),$0}' ${file} | sort -nr | cut -d ' ' -f 12-`;
    const highRTFile = `${dirName}max-response-time.txt`;
    const message = {
        success: `Dispatcher max response time requests list is available at ${highRTFile}`,
        error: ``,
        fileName: `${file}`,
        commandName: 'displayTopNRequestCommand'
    };

    return executeProcess(topNComand, highRTFile, message);
}

const displayErrors = (file) => {
    const dirName = getParentDirectoryName(file) !== '' ? getParentDirectoryName(file) + '-' : '';
    const errorCommand = `awk '{if("[E]" == $6) print }' ${file} | cut -d ' ' -f 11- | sort -nr | uniq -c `;
    const errorFileName = `${dirName}dispatcher-errors.txt`;
    const message = {
        success: `Dispatcher error list is available at ${errorFileName}`,
        error: ``,
        fileName: `${file}`,
        commandName: 'displayErrorsCommand'
    };
    return executeProcess(errorCommand, errorFileName, message);
}

const displayWarningsUrls = (file) => {
    const dirName = getParentDirectoryName(file) !== '' ? getParentDirectoryName(file) + '-' : '';
    const warningCommand = `awk '{if("[W]" == $6) print  }' ${file} | cut -d ' ' -f 11- | sort -nr | uniq -c`
    const dispatcherWarningsFile = `${dirName}dispatcher-warnings.txt`;
    const message = {
        success: `Dispatcher warnings list is available at ${dispatcherWarningsFile}`,
        error: ``,
        fileName: `${file}`,
        commandName: 'displayWarningsUrlsCommand'
    };

    return executeProcess(warningCommand, dispatcherWarningsFile, message);
}

const maxCacheRatioFn = (file) => {
    const maxCacheRatioCommand = `awk '{if(/Current cache hit ratio/) print $(NF-1) }'  ${file} | sort -nr | head -1`;
    const message = {
        success: `Max cache ratio `,
        error: ``,
        fileName: `${file}`,
        commandName: 'maxCacheRatioFnCommand'
    };
    return executeProcess(maxCacheRatioCommand, null, message);
}

const minCacheRatioFn = (file) => {
    const minCacheRatioCommand = `awk '{if(/Current cache hit ratio/) print $(NF-1) }' ${file} | sort  | head -1`;
    const message = {
        success: `Min cache ratio `,
        error: ``,
        fileName: `${file}`,
        commandName: 'minCacheRatioFnCommand'
    };
    return executeProcess(minCacheRatioCommand, null, message);
}

const dispatcherVersion = (file) => {
    var dispVersionCommand = `awk '{if(/Dispatcher initialized/) print $(NF-1) " " $NF }' ${file}`;
    const message = {
        success: `Dispatcher Version used `,
        error: ``,
        fileName: `${file}`,
        commandName: 'dispatcherVersionCommand'
    };
    return executeProcess(dispVersionCommand, null, message);
}
var startTime = '';
rl.question("Enter dispatcher file path:: ", function (fileName) {
    rl.pause();
    const file = path.basename(fileName);
    let fileDirName = getParentDirectoryName(fileName);
    let filePaths = [];
    if (fileDirName && "*" === fileDirName) {
        let fileDirPath = path.dirname(fileName);
        let dirParentDir = path.dirname(fileDirPath);
        const directories = fs.readdirSync(dirParentDir, { withFileTypes: true })
            .filter(dir => dir.isDirectory).map(dir => dir.name);
        filePaths = directories.map(dir => dirParentDir.concat('/').concat(dir).concat('/').concat(file));

    } else {
        filePaths.push(fileName)
    }
    startTime = new Date().getTime();
    const promises = [];
    for (let counter = 0; counter < filePaths.length; counter++) {
        const dispFileName = filePaths[counter];
        promises.push(Promise.all([dispatcherVersion(dispFileName), maxCacheRatioFn(dispFileName), minCacheRatioFn(dispFileName),
        displayErrors(dispFileName), displayWarningsUrls(dispFileName), displayTopNRequest(dispFileName)]));

    }
    Promise.all(promises).then(() => {
        console.log(`Execution time : ${new Date().getTime() - startTime}ms`);
    });

});

const getParentDirectoryName = (fileName) => path.basename(path.dirname(fileName)) === '.' ? '' : path.basename(path.dirname(fileName));

rl.on("close", function () {

    process.exit(0);
});


