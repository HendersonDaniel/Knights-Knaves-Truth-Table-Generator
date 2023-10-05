// Parsing user input from logic notation
function parseInput(input) {
  // Extract only valid variable names
  const tokens = input.match(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g) || [];

  // Filtering out logic keywords
  const logicKeywords = ['xor', 'and', 'or', 'iff', 'true', 'false'];
  const variables = tokens.filter(token => !logicKeywords.includes(token));

  return Array.from(new Set(variables));
}

// Generate truth table combinations
function generateCombinations(vars) {
  if (vars.length === 0) return [[]];

  const restvars = vars.slice(1);
  const smallerCombinations = generateCombinations(restvars);
  
  return smallerCombinations.flatMap(combination => [
      [false, ...combination],
      [true, ...combination]
  ]);
}

function xor(a, b) {
  return a !== b;
}

function iff(a, b) {
  return a === b;
}

function implies(a, b) {
  return !a || b;
}

function evaluateInnermostParentheses(exp, values) {
  const parenRegex = /\(([^()]+)\)/; // This matches the innermost parentheses

  while (parenRegex.test(exp)) {
      let match = exp.match(parenRegex);
      let innerResult = evaluateExpressionWithoutParens(match[1], values); 
      exp = exp.replace(match[0], String(innerResult)); // Ensure innerResult is cast to string for proper replacement
  }

  return exp;
}

function handleIFF(exp) {
  const matchesRegex = /([a-zA-Z0-9_]+)\s*=\s*([a-zA-Z0-9_]+|\([^)]*\))/;
  while (matchesRegex.test(exp)) {
      exp = exp.replace(matchesRegex, (match, leftVar, rightVar) => {
          return `iff(${leftVar}, ${rightVar})`;
      });
  }
  return exp;
}

function handleXor(exp) {
  const xorRegex = /(\w+|\([^)]+\))\s*xor\s*(\w+|\([^)]+\))/;
  while (xorRegex.test(exp)) {
      exp = exp.replace(xorRegex, (match, leftVar, rightVar) => {
          return `xor(${leftVar.trim()}, ${rightVar.trim()})`;
      });
  }
  return exp;
}

function handleImplies(exp) {
  const impliesRegex = /(\b\w+\b|\(.*?\))\s*->\s*(\b\w+\b|\(.*?\))/g; 
  let newExp = '';
  let lastEndIndex = 0;

  let match;
  while (match = impliesRegex.exec(exp)) {
      const leftOperand = match[1];
      const rightOperand = match[2];
      newExp += exp.substring(lastEndIndex, match.index) + `implies(${leftOperand}, ${rightOperand})`;
      lastEndIndex = match.index + match[0].length;
  }
  newExp += exp.substring(lastEndIndex);
  
  return newExp;
}


function evaluateExpressionWithoutParens(expression, values) {
  let exp = expression;

  exp = handleXor(exp);
  exp = handleIFF(exp);
  exp = handleImplies(exp);

  exp = exp
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\btrue\b/g, 'true')
      .replace(/\bfalse\b/g, 'false');

  // Replace variable values after replacing operators
  for (let key in values) {
      if (!['xor', 'and', 'or', 'iff', '->', '='].includes(key)) {
          exp = exp.replace(new RegExp('\\b' + key + '\\b', 'g'), String(values[key]));
      }
  }

  console.log("Evaluating:", exp);

  // Using IIFE to evaluate the expression, passing helper functions as arguments
  try {
      return eval(`(function(xor, iff, implies) { return ${exp}; })`)(xor, iff, implies);
  } catch (e) {
      console.error(`Failed to evaluate expression "${expression}":`, e);
      return false;
  }
}

function evaluateExpression(expression, values) {
  let expWithoutParens = evaluateInnermostParentheses(expression, values);
  return evaluateExpressionWithoutParens(expWithoutParens, values);
}

function isValidExpression(expression) {
  // Replace all valid variables and literals with "v"
  let test = expression.replace(/\b(true|false|[a-zA-Z_][a-zA-Z0-9_]*)\b/g, "v");

  // Replace all valid operators and parentheses with "o"
  test = test.replace(/(xor|and|or|iff|->|=)/g, "o");
  
  // Ensure parentheses match
  let stack = [];
  for(let char of test) {
    if(char === '(') stack.push(char);
    if(char === ')') {
      if(stack.length === 0) return false;
      stack.pop();
    }
  }
  if(stack.length > 0) return false;

  // Ensure the expression is valid after transformation
  return !/oo|vo|ov|vv/.test(test) && !/^o|o$/.test(test);
}

// DOMContentLoaded event
document.addEventListener("DOMContentLoaded", function () {
  const inputElement = document.getElementById("new-task-title");

  document.getElementById("new-task-form").addEventListener("submit", function (e) {
      e.preventDefault();

      const inputValue = inputElement.value;

      if (!isValidExpression(inputValue)) {
        console.error("Invalid logic expression.");
        return;
    }

      const variables = parseInput(inputValue);
      const combinations = generateCombinations(variables);
      
      const table = combinations.map(combination => {
          const values = Object.fromEntries(variables.map((variable, idx) => [variable, combination[idx]]));
          console.log("Processing input:", inputValue, "with values:", values);
          const result = evaluateExpression(inputValue, values);
          return [...combination, result];
      });
      
      table.unshift([...variables, inputValue]);

      console.log(XLSX.version);
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(table);
      
      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, "test.xlsx");
  });
});