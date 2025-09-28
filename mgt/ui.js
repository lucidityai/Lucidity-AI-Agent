import termkit from 'terminal-kit';
const term = termkit.terminal;


var progressBar , progress = 0 ;

// helper function for term.js usage just because manually making a new line is tedious
async function print(text, color="blue") {
    await term[color](text + "\n");   
}

function options(...args) {
    return new Promise((resolve, reject) => {
        var items = [...args];
        term.singleColumnMenu(items, { cancelable: true }, function(error, response) {
            if (error) {
                reject(error);
            } else {
                resolve(response.selectedText);
            }
        });
    });
}


function makeProgress(title) {
    progressBar = term.progressBar( {
        width: 80 ,
        title: title,
        eta: false ,
        percent: true
    } ) ;
}

function updateProgress(progress) {
    progress = progress || 0 ;
    progressBar.update( progress ) ;
}

// export
export { print, makeProgress, updateProgress, options }