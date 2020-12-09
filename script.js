
const textarea = document.querySelector('textarea');

const calcBtn = document.querySelector('#calc');
const total = document.querySelector('#total');
const totalWrapper = document.querySelector('#total-wrapper');

const helpBtn = document.querySelector('#helpBtn');
const help = document.querySelector('#help');
const helpWrapper = document.querySelector('#help-wrapper');


// YYYY-MM[-DD[Thh[:mm[:ss[.sss]]]]]
const datetimeRegex = /(([\+\-]\d\d)?\d\d\d\d\-\d\d(\-\d\d)?|\-\-\d\d\-\d\d)(T\d\d(:\d\d(:\d\d(\.\d{1,3})?)?)?)?|T\d\d(:\d\d(:\d\d(\.\d{1,3})?)?)?/g;
// n[.n] where n is any integer
const numRegex = /-?\d+(\.\d+)?/g;
// nYnMnDTnHnMnS where n is any number 
const durRegex = /(?=-?\d+(\.\d+)?[YMD]|-?T\d+(\.\d+)?[HMS])-?(\d+(\.\d+)?Y)?(\d+(\.\d+)?M)?(\d+(\.\d+)?D)?(-?T(?=\d+(\.\d+)?[HMS])(\d+(\.\d+)?H)?(\d+(\.\d+)?M)?(\d+(\.\d+)?S)?)?/g;
const regexes = [datetimeRegex, numRegex, durRegex];


function regexTest (str, regex) {
  if (str.match(regex) ? str.match(regex)[0] === str : false) return true;
  else return false;
}

function preVal1 (exp) {
  const arr = exp.split(' ');

  for (let i = 0; i < arr.length; i++) {
    if (arr.length === 1) break;
    if ((regexTest(arr[i], /[*\/+-]|=>/) && (i === 0 || i === arr.length - 1)) // operator at the beginning or the end of the input
      || (regexTest(arr[i], /[*\/+-]|=>/) && (i > 0 && i < arr.length - 1) // if it's an operator (not at the beginning or end of the input) and...
        && (!([regexes, /\)/].flat().some(regex => regexTest(arr[i - 1], regex))) // it's preceded by something other than a datetime, duration, number, or right parenthesis
          || !([regexes, /\(/].flat().some(regex => regexTest(arr[i + 1], regex))))) // or it's followed by something other than a datetime, duration, number, or left parenthesis
      || (regexes.some(regex => regexTest(arr[i], regex)) // if it's a datetime, duration, or number and...
        && ((i === 0 && !regexTest(arr[i + 1], /[*\/+-]|=>/)) // if it's at the beginning of the input and is followed by something other than an operator
          || (i === arr.length - 1 && !regexTest(arr[i - 1], /[*\/+-]|=>/)) // if it's at the end of the input and is preceded by something other than an operator
          || (i > 0 && i < arr.length - 1 // if it's at neither the beginning nor the end of the input and...
            && (!regexTest(arr[i - 1], /[*\/+\-(]|=>/) || !regexTest(arr[i + 1], /[*\/+\-)]|=>/)))))) { // it's preceded by something other than an operator or a left parenthesis, or is followed by something other than an operator or a right parenthesis
      error('Please use infix notation.');
      return false;
    } 
  }
  return true;
}

function preVal (exp) {
  const arr = exp.split(' ');
  // test if every element is a datetime, number, duration, or operator
  for (let i = 0; i < arr.length; i++) {
    if (![...regexes, /[*\/+\-()]|=>/].some(regex => arr[i].match(regex) ? arr[i].match(regex)[0] === arr[i] : false)) {
      return [false, arr[i]];
    };
  }
  return [true];
}

// shunting-yard 
function toPostfix (exp) {
  const arr = exp.split(' ');

  const output = [];
  let opStack = [];

  

  function opTest (op) {
    let ops = ['+', '-', '+', '*', '/', '*', '=>'];
    while (opStack.length > 0 && ops.slice(ops.indexOf(op)).some(el => new RegExp('\\' + el).test(opStack[0])) && opStack[0] !== '(') {
      output.push(opStack.splice(0, 1));
    }
    opStack.unshift(op);
  }

  // go through every term and operator. 
  // if it's a term, push to the output. 
  // if it's an operator, push it to the operator stack and check it against the last operator in the operator stack.
  // if that last operator is of equal or greater precedence, then push all operators from the operator stack to the output.
  arr.forEach((el, i) => {
    if (regexes.some(regex => el.match(regex) ? el.match(regex)[0] === el : false)) output.push(el);
    else if (/[+\-*\/]|=>/.test(el)) opTest(el);
    else if (/\(/.test(el)) opStack.unshift(el);
    else if (/\)/.test(el)) {
      
      for (let j = 0; j < opStack.length; j++) {
        if (opStack[j] !== '(') {
          output.push(opStack[j]);
          opStack.splice(j, 1);
          j--;
        } else {
          opStack.splice(j, 1);
          j--;
          break;
        }
      }
    }
  });

 
  opStack.forEach(el => output.push(el));
  return output.join(' ');
} 

// converts durations to seconds i.e. to TnS
function durInSecs (duration) {
  let dur = Array.from(duration);
  let parts = [];

  let isNeg = false;
  if (dur[0] === '-') {
    dur.splice(0, 1);
    isNeg = true;
  }

  // go through every character in the duration and add each nY, nM (months), nD, nH, nM (minutes), and nS to parts
  for (let i = 0; i < dur.length; i++) {
    parts.push('');
    let arr = dur.slice(i);
    let c = -1;
    for (let j = 0; j < arr.length; j++) {
      parts[parts.length - 1] += arr[j];
      c++;
      if (/[YMDTHS]/.test(arr[j])) break;
    }
    i += c;
  }

  let seconds = 0;
  let isMinutes = false; 

  // convert each part to seconds and add the number of seconds together
  parts.forEach(part => {
    if (part === 'T') isMinutes = true; // if an M comes after a T, it means minutes
    if (part.match(numRegex) !== null) {
      const numPart = Number(part.match(numRegex)[0]);
      switch (part.match(/[YMDHS]/)[0]) {
        case 'Y':
          seconds += numPart * 12 * ((31 * 7 + 28 + 30 * 4) / 12) * 24 * 60 * 60;
          break;
        case 'M':
          seconds += numPart * (isMinutes ? 60 : ((31 * 7 + 28 + 30 * 4) / 12) * 24 * 60 * 60);
          break;
        case 'D':
          seconds += numPart * 24 * 60 * 60;
          break;
        case 'H':
          seconds += numPart * 60 * 60;
          break;
        case 'S':
          seconds += Number(numPart);
          break;
      }
    }
  });

  if (isNeg) seconds *= -1;
  // return the total number of seconds
  return seconds;
} 

// converts datetime strings (YYYY-MM-DDThh:mm:ss.sss) to an array whose values can be used with Date.UTC() (Date.parse() is inconsistent across browsers)
function datetimeStrToArr (dt) {
  if (dt.includes('T')) {
    dt = dt.split('T');
    if (dt[0] === '') {
      dt.shift();
      dt[0] = dt[0].replace(/\./g, ':').split(':');
      let date = new Date(); 
      dt.unshift(date.getFullYear(), date.getMonth(), date.getDate()); // if a date isn't specified, use the current date
    } else {
      if (/\-\-\d\d\-\d\d/.test(dt[0])) {
        let date = new Date();
        dt[0] = [date.getFullYear(), Number(dt[0].match(/\d\d/g)[0]) - 1, dt[0].match(/\d\d/g)[1]];
      } else {
        if (dt[0][0] === '-') {
          dt[0] = dt[0].replace(/^-/, 'a').split('-');
          dt[0][0] = dt[0][0].replace('a', '-');
        } else {
          dt[0] = dt[0].split('-');
        }
        dt[0][1] = Number(dt[0][1]) - 1;
        if (dt[0].length === 2) dt[0].push(0);
      }
      dt[1] = dt[1].replace(/\./g, ':').split(':');
    }
  } else {
    if (/\-\-\d\d\-\d\d/.test(dt)) {
      let date = new Date();
      dt = [date.getFullYear(), Number(dt.match(/\d\d/g)[0]) - 1, dt.match(/\d\d/g)[1]];
    } else {
      if (dt[0] === '-') {
        dt = dt.replace(/^-/, 'a').split('-');
        dt[0] = dt[0].replace('a', '-');
      } else {
        dt = dt.split('-');
      }
      dt[1] = Number(dt[1]) - 1;
      if (dt[0].length === 2) dt[0].push(0);
    }
  }
  dt = dt.flat();
  dt = dt.map(part => Number(part));
  return dt;
}

function invalTerms (arr, op) {
  let terms = [];
  for (let j = 0; j < arr.length; j++) {
    for (let k = 0; k < regexes.length; k++) {
      if (arr[j] ? (arr[j].match(regexes[k]) ? arr[j].match(regexes[k])[0] === arr[j] : false) : false) {
        switch (k) {
          case 0:
            terms[j] = '<datetime>';
            break;
          case 1:
            terms[j] = '<number>';
            break;
          case 2:
            terms[j] = '<duration>';
            break;
        }
        break;
      } else terms[j] = 'null';
    };
  }
  terms.push(op);
  return terms;
}

// evaluates the postfix expression. returns a datetime, number, or duration.
function calc (exp) {
  const output = [];
  let arr = exp.split(' ');
  // go through every element of the postfix expression.
  for (let i = 0; i < arr.length; i++) {
    // if it's a datetime, number, or duration, push it to output
    if (regexes.some(regex => regexTest(arr[i], regex))) {
      if (regexTest(arr[i], durRegex)) {
        if (arr[i][0] === '-') output.push(`-T${Math.abs(durInSecs(arr[i]))}S`)
        else output.push(`T${durInSecs(arr[i])}S`);
      }
      else if (regexTest(arr[i], datetimeRegex)) {
        if (isNaN(Date.UTC(...datetimeStrToArr(arr[i])))) {
          error('Invalid datetime')
          return 'error';
        }
        let dt = new Date(Date.UTC(...datetimeStrToArr(arr[i]))).toISOString();
        dt = dt.slice(0, dt.length - 1);
        let time = dt.split('T')[1].match(/\d+/g);
        for (let j = time.length - 1; j >= 0; j--) {
          if (Number(time[j]) === 0) {
            time.pop();
          } else {
            break;
          }
        }
        if (time.length === 0) {
          dt = dt.split('T')[0];
        } else {
          dt = time.length === 4 ? `${dt.split('T')[0]}T${time[0]}:${time[1]}:${time[2]}.${time[3]}` : dt.split('T')[0] + 'T' + time.join(':');
        }
        output.push(dt);
      } else output.push(arr[i]);
    } else if (/=>/.test(arr[i])) { // <datetime> => <datetime> = <duration>
      let datetimes = [output.splice(output.length - 2, 1)[0], output.splice(output.length - 1, 1)[0]];
      if (!datetimes.every(datetime => regexTest(datetime, datetimeRegex))) {
        const inval = invalTerms(datetimes, '=>');
        error(`Invalid operation: ${inval[0]} ${inval[2]} ${inval[1]}`)
        return 'error';
      }
      datetimes = datetimes.map(datetime => datetimeStrToArr(datetime));
      const start = Date.UTC(...datetimes[0]);
      const end = Date.UTC(...datetimes[1]);

      const elapsed = ((end - start) / 1000).toString();
      if (elapsed[0] === '-') output.push(`-T${Math.abs(elapsed)}S`);
      else output.push(`T${elapsed}S`);
      
    } else if (/\*/.test(arr[i])) { 
      const factors = [output.splice(output.length - 2, 1)[0], output.splice(output.length - 1, 1)[0]];
      // <number> * <number> = <number>
      if (factors.every(factor => regexTest(factor, numRegex))) { 
        const product = factors[0] * factors[1]; 
        output.push(product.toString());
        // <number> * <duration> or <duration> * <number> = <duration>
      } else if ((regexTest(factors[0], numRegex) && regexTest(factors[1], durRegex)) 
              || (regexTest(factors[1], numRegex) && regexTest(factors[0], durRegex))) {
        let dur;
        let num;
        factors.forEach(factor => {
          if (regexTest(factor, numRegex)) num = factor;
          if (regexTest(factor, durRegex)) dur = factor;
        });
        dur = durInSecs(dur); 
        const product = (dur * num).toString();
        if (product[0] === '-') output.push(`-T${Math.abs(product)}S`);
        else output.push(`T${product}S`);
      } else {
        const inval = invalTerms(factors, '*');
        error(`Invalid operation: ${inval[0]} ${inval[2]} ${inval[1]}`);
        return 'error';
      }
    } else if (/\//.test(arr[i])) {
      const terms = [output.splice(output.length - 2, 1)[0], output.splice(output.length - 1, 1)[0]];
      if (terms[1] == 0) {
        error('Division by zero');
        return 'error';
      }
      // <number> / <number> = <number>
      if (terms.every(term => regexTest(term, numRegex))) {
        const quotient = terms[0] / terms[1];
        output.push(quotient.toString());
        // <duration> / <duration> = <number>
      } else if (terms.every(term => regexTest(term, durRegex))) {
        const durs = terms.map(term => durInSecs(term));
        const quotient = durs[0] / durs[1];
        output.push(quotient.toString());
        // <duration> / <number> = <duration>
      } else if (regexTest(terms[0], durRegex) && regexTest(terms[1], numRegex)) {
        let dur = terms[0];
        let num = terms[1];
        dur = durInSecs(dur);
        const quotient = (dur / num).toString();
        if (quotient[0] === '-') output.push(`-T${Math.abs(quotient)}S`);
        else output.push(`T${quotient}S`);
      } else {
        const inval = invalTerms(terms, '/');
        error(`Invalid operation: ${inval[0]} ${inval[2]} ${inval[1]}`);
        return 'error';
      }
    } else if (/\+/.test(arr[i])) {
      const addends = [output.splice(output.length - 2, 1)[0], output.splice(output.length - 1, 1)[0]];
      // <number> + <number> = <number>
      if (addends.every(addend => regexTest(addend, numRegex))) {
        const sum = Number(addends[0]) + Number(addends[1]);
        output.push(sum.toString());
        // <duration> + <duration> = <duration>
      } else if (addends.every(addend => regexTest(addend, durRegex))) {
        const sum = (durInSecs(addends[0]) + durInSecs(addends[1])).toString();
        if (sum[0] === '-') output.push(`-T${Math.abs(sum)}S`);
        else output.push(`T${sum}S`);
        // <datetime> + <duration> or <duration> + <datetime> = <datetime>
      } else if ((regexTest(addends[0], datetimeRegex) && regexTest(addends[1], durRegex)) 
              || (regexTest(addends[0], durRegex) && regexTest(addends[1], datetimeRegex))) {
        let dt;
        let dur;
        addends.forEach(addend => {
          if (regexTest(addend, datetimeRegex)) dt = Date.UTC(...datetimeStrToArr(addend));
          if (regexTest(addend, durRegex)) dur = durInSecs(addend) * 1000;
        });
        let sum = new Date(dt + dur);
        if (sum.toString() === 'Invalid Date') {
          error('Invalid datetime');
          return 'error';
        }
        sum = sum.toISOString();
        sum = sum.slice(0, sum.length - 1);
        let time = sum.split('T')[1].match(/\d+/g);
        for (let j = time.length - 1; j >= 0; j--) {
          if (Number(time[j]) === 0) {
            time.pop();
          } else {
            break;
          }
        }
        if (time.length === 0) {
          sum = sum.split('T')[0];
        } else {
          sum = time.length === 4 ? `${sum.split('T')[0]}T${time[0]}:${time[1]}:${time[2]}.${time[3]}` : sum.split('T')[0] + 'T' + time.join(':');
        }
        output.push(sum);
      } else {
        const inval = invalTerms(addends, '+');
        error(`Invalid operation: ${inval[0]} ${inval[2]} ${inval[1]}`);
        return 'error';
      }
    } else if (/\-/.test(arr[i])) {
      const terms = [output.splice(output.length - 2, 1)[0], output.splice(output.length - 1, 1)[0]];
      // <number> - <number> = <number>
      if (terms.every(term => regexTest(term, numRegex))) {
        const difference = terms[0] - terms[1];
        output.push(difference.toString());
        // <duration> - <duration> = <duration>
      } else if (terms.every(term => regexTest(term, durRegex))) {
        const difference = durInSecs(terms[0]) - durInSecs(terms[1]);
        if (difference[0] === '-') output.push(`-T${Math.abs(difference)}S`);
        else output.push(`T${difference}S`);
        // <datetime> - <duration> = <datetime>
      } else if (regexTest(terms[0], datetimeRegex) && regexTest(terms[1], durRegex)) {
        let dt = Date.UTC(...datetimeStrToArr(terms[0]));
        let dur = durInSecs(terms[1]) * 1000;
        let difference  = new Date(dt - dur);
        if (difference.toString() === 'Invalid Date') {
          error('Invalid datetime')
          return 'error';
        }
        difference = difference.toISOString();
        difference = difference.slice(0, difference.length - 1);
        let time = difference.split('T')[1].match(/\d+/g);
        for (let j = time.length - 1; j >= 0; j--) {
          if (Number(time[j]) === 0) {
            time.pop();
          } else {
            break;
          }
        }
        if (time.length === 0) {
          difference = difference.split('T')[0];
        } else {
          difference = time.length === 4 ? `${difference.split('T')[0]}T${time[0]}:${time[1]}:${time[2]}.${time[3]}` : difference.split('T')[0] + 'T' + time.join(':');
        }
        output.push(difference);
      } else {
        const inval = invalTerms(terms, '-');
        error(`Invalid operation: ${inval[0]} ${inval[2]} ${inval[1]}`);
        return 'error';
      }
    }
  }
  let result = output[0];


  let places = 3;

  
  if (regexTest(result, datetimeRegex)) {
    let date = new Date(Date.UTC(...datetimeStrToArr(result))).toUTCString();
    date = date.slice(0, date.length - 4) + (datetimeStrToArr(result)[6] ? '.' + datetimeStrToArr(result)[6] : '');
    result = date;
  }

  if (regexTest(result, /\d+\.\d+/g)) {
    if (result.split('.')[1].length > places && Array.from(Number(result).toFixed(places).toString().split('.')[1]).some(dig => dig !== '0')) result = Number(result).toFixed(places).toString().replace(/0+$/, '');
    else if (Array.from(Number(result).toFixed(places).toString().split('.')[1]).every(dig => dig === '0')) result = Math.floor(result).toString();

    result = result.replace(/^0+/, '');
  }

  if (result.match(numRegex)[0] === result) result = result.replace(/^0+(?=\d)/, '');


  if (regexTest(result, durRegex) || regexTest(result, /T\-\d+(\.\d+)?S/)) {
    result = [0, 0, 0, 0, 0, result[0] === '-' ? Number(result.match(numRegex)[0]) * -1 : Number(result.match(numRegex)[0])];
    let isNeg = false;


    if (result[5].toString()[0] === '-') {
      isNeg = true;
      result[5] = Number(result[5].toString().match(/\d+(\.\d+)?/)[0]);
    }

    let multipliers = [12, 730, 24, 60, 60];
    for (let i = result.length - 1; i > 0; i--) {
      if (i === 3) {
        let temp = result[i];
        result[i] %= multipliers[i - 2];
        result[i - 2] += Math.floor(temp / multipliers[i - 2]);

        temp = result[i];
        result[i] %= multipliers[i - 1];
        result[i - 1] += Math.floor(temp / multipliers[i - 1]);

        i--;
      } else {
        let temp = result[i];
        result[i] %= multipliers[i - 1];
        result[i - 1] += Math.floor(temp / multipliers[i - 1]);
      }
    }


    result = result.map(el => {
      if (el.toString().includes('.')) {
        if (el.toString().split('.')[1].length > places && Array.from(el.toFixed(places).toString().split('.')[1]).every(dig => dig !== '0')) return Number(el).toFixed(places).toString().replace(/0+$/, '');
        else return Math.floor(el);
      } else return el;
      
    });


    let durArr = [' seconds, ', ' minutes, ', ' hours, ', ' days, ', ' months, ', ' years, '];

    if (result.every(el => el == '0')) result = '0 seconds, ';
    else {
      result = result.reverse().reduce((acc, cur, idx, src) => {
        if (idx === 3 && src.slice(0,3).some(el => el != 0)) acc.unshift('T');
        if (cur != 0) acc.unshift(cur + (Math.abs(cur) == 1? `${durArr[idx].slice(0, durArr[idx].length - 3)}, ` : durArr[idx]));
        if (src.length < 4 && idx === src.length - 1) acc.unshift('T');
        return acc;
      }, []).join('');
    }

    result = result.split('T').join('');
    result = result.slice(0, result.length - 2);

    if (isNeg) result = `-${result}`;
  }
  
  return result;
}

function error (message) {
  animateTotal(message, 'red');
}


let id;

function animateTotal (input, color) {

  let start;
  function rAF (timestamp) {
    if (start === undefined) start = timestamp;
    const elapsed = timestamp - start;
      
    if (elapsed === 0 && totalWrapper.offsetHeight === 0) {
      total.textContent = input;
      total.style.color = color;
      totalWrapper.style.height = `${total.offsetHeight}px`;
    } else if (elapsed === 0 && totalWrapper.offsetHeight !== 0) {
      let start1;
      id = requestAnimationFrame(function rAF1(timestamp1) {
        if (start1 === undefined) start1 = timestamp1;
        const elapsed1 = timestamp1 - start1;
        if (elapsed1 === 0) {
          totalWrapper.style.height = `0px`;
        }
        if (elapsed1 < 100) {
          id = requestAnimationFrame(rAF1);
        } else {
          total.textContent = input;
          total.style.color = color;
          totalWrapper.style.height = `${total.offsetHeight}px`;
        }
      });
    }

    if (elapsed < 100) {
      id = requestAnimationFrame(rAF);
    }
  }

  id = requestAnimationFrame(rAF);

}


const log = console.log;
const group = console.group;
const groupEnd = console.groupEnd;

calcBtn.addEventListener('mousedown', () => {

  if (id) cancelAnimationFrame(id);


  let date = new Date();
  date = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), date.getHours(), date.getMinutes(), date.getSeconds(), date.getMilliseconds());
  date = new Date(date).toISOString();
  date = date.slice(0, date.length - 1);
  const textCorrected = textarea.value.replace(/\(/g, ' ( ') // so parentheses don't need to be surrounded by spaces
    .replace(/\)/g, ' ) ')
    .replace(/,/g, '') // so users can use commas to make large numbers easier to read
    .replace(/\s+/g, ' ') // so any amount of whitespace can separate terms and operators
    .replace(/^\s/, '') // so whitespace can be entered at the beginning of the input
    .replace(/\s$/, '') // so whitespace can be entered at the end of the input
    .toUpperCase() // so the input is case-insensitive
    .replace(/NOW/g, date); // so the string "now" equals the current datetime

  log(textCorrected);
  if (textCorrected === '') {
    animateTotal('');
  }
  else if ((textCorrected.match(/\(/g) ? textCorrected.match(/\(/g).length : 0) !== (textCorrected.match(/\)/g) ? textCorrected.match(/\)/g).length : 0)) {
    error('Unmatched parentheses');
  } else if (!preVal(textCorrected)[0]) {
    error(`Unrecognized element: ${preVal(textCorrected)[1]}`);
  } else if (preVal1(textCorrected) && calc(toPostfix(textCorrected)) !== 'error') {
    log('postfix : ' + toPostfix(textCorrected));
    log('calculated result : ' + calc(toPostfix(textCorrected)));
    
    animateTotal(calc(toPostfix(textCorrected)), 'black');

  }

});



let helpBool = false;
helpBtn.addEventListener('mousedown', e => {
  helpBool = !helpBool;

  // help.classList.toggle('collapsed');
  if (helpBool) {
    e.target.style.boxShadow = '0 0 0.5em lightgray inset';

    helpWrapper.style.height = `${help.offsetHeight}px`;
  } else {
    e.target.style.boxShadow = '0 0 0.5em lightgray';
    helpWrapper.style.height = '0px';
  }
});


