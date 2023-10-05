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
  const xorRegex = /\b(?:(\w+)|\(([^)]+)\))\s*xor\s*(?:(\w+)|\(([^)]+)\))\b/;
  while (xorRegex.test(exp)) {
      exp = exp.replace(xorRegex, (match, leftVar1, leftVar2, rightVar1, rightVar2) => {
          const leftOperand = leftVar1 || `(${leftVar2})`;
          const rightOperand = rightVar1 || `(${rightVar2})`;
          return `xor(${leftOperand}, ${rightOperand})`;
      });
  }
  return exp;
}

function handleImplies(exp) {
  const impliesRegex = /\b(?:(\w+)|\(([^)]+)\))\s*->\s*(?:(\w+)|\(([^)]+)\))\b/;
  while (impliesRegex.test(exp)) {
      exp = exp.replace(impliesRegex, (match, leftVar1, leftVar2, rightVar1, rightVar2) => {
          const leftOperand = leftVar1 || `(${leftVar2})`;
          const rightOperand = rightVar1 || `(${rightVar2})`;
          return `implies(${leftOperand}, ${rightOperand})`;
      });
  }
  return exp;
}

function evaluateExpression(expression, values) {
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
      if(!['xor', 'and', 'or', 'iff', '->', '='].includes(key)) {
      exp = exp.replace(new RegExp('\\b' + key + '\\b', 'g'), String(values[key]));
    }
  }

  console.log("Evaluating:", exp);

  try {
      return eval(exp);
  } catch (e) {
      console.error(`Failed to evaluate expression "${expression}":`, e);
      return false;
  }
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