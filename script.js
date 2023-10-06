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

function handleNegation(exp) {
  const negationRegex = /~([a-zA-Z_][a-zA-Z0-9_]*|\((?:[^()]|\([^)]*\))+\))/g;
  return exp.replace(negationRegex, (match, varOrExpr) => {
      // Check if varOrExpr is a parentheses expression and, if so, process its content
      if (varOrExpr.startsWith('(') && varOrExpr.endsWith(')')) {
          return `!${varOrExpr}`;
      }
      return `!${varOrExpr}`; // negate the variable
  });
}

function evaluateInnermostParentheses(exp, values) {
  const parenRegex = /\(([^()]+)\)/; // This matches the innermost parentheses

  let match;
  while (match = exp.match(parenRegex)) {
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
  let prevExpression;
  do {
      prevExpression = exp;
      exp = exp.replace(/(~?[a-zA-Z_][a-zA-Z0-9_]*|\([^)]+\))\s*->\s*(~?[a-zA-Z_][a-zA-Z0-9_]*|\([^)]+\))/, (match, leftVar, rightVar) => {
          return `implies(${leftVar}, ${rightVar})`;
      });
  } while (exp !== prevExpression);
  return exp;
}

function evaluateExpressionWithoutParens(expression, values) {
  let exp = expression;

  // 1. Print the initial expression
  console.log("Initial Expression:", exp);

  exp = handleNegation(exp); 
  // 1.1 Print after handleNegation
  console.log("After handleNegation:", exp);       

  exp = handleXor(exp);
  // 1.2 Print after handleXor
  console.log("After handleXor:", exp);

  exp = handleIFF(exp);
  // 1.3 Print after handleIFF 
  console.log("After handleIFF:", exp);  

  exp = handleImplies(exp);
  // 1.4 Print after handleImplies
  console.log("After handleImplies:", exp);

  exp = exp
      .replace(/\band\b/g, '&&')
      .replace(/\bor\b/g, '||')
      .replace(/\btrue\b/g, 'true')
      .replace(/\bfalse\b/g, 'false');

  // Replace variable values after replacing operators
  for (let key in values) {
      if (!['xor', 'and', 'or', 'iff', '->', '=', '~'].includes(key)) { 
          exp = exp.replace(new RegExp('\\b' + key + '\\b', 'g'), String(values[key]));
      }
  }

  // Check for any residual implications
  if (exp.includes("->")) {
      throw new Error("Failed to process some implications in the expression.");
  }

  console.log("Evaluating:", exp);

  // Using IIFE to evaluate the expression, passing helper functions as arguments
  try {
      return eval(`(function(xor, iff, implies) { return ${exp}; })`)(xor, iff, implies);
  } catch (e) {
      console.error(`Failed to evaluate expression "${expression}":`, e);
      throw e;  // propagate the error so we can handle it later
  }
}

function evaluateExpression(expression, values) {
  let exp = expression;

  while (/\(/.test(exp)) { // As long as there are parentheses
      exp = evaluateInnermostParentheses(exp, values);
  }

  // 3. Wrap the evaluation inside try-catch
  try {
      return evaluateExpressionWithoutParens(exp, values);
  } catch (error) {
      console.error(`Error evaluating logic expression: ${expression} - ${error.message}`);
      throw error;  // propagate the error to be caught outside
  }
}

function isValidExpression(expression) {
  const dummyValues = {};
  const variables = parseInput(expression);
  for (let variable of variables) {
      dummyValues[variable] = true;  // Use any boolean value as a dummy value
  }
  try {
      evaluateExpression(expression, dummyValues);
      return true;
  } catch (e) {
      return false;
  }
}

// DOMContentLoaded event
document.addEventListener("DOMContentLoaded", function () {
  const inputElement = document.getElementById("new-task-title");

  document.getElementById("new-task-form").addEventListener("submit", function (e) {
      e.preventDefault();

      const rawInput = inputElement.value.trim();
      const expressions = rawInput.split(',').map(expr => expr.trim());

      // Check if all expressions are valid
      for (const expr of expressions) {
          if (!isValidExpression(expr)) {
              console.error(`Invalid logic expression: ${expr}`);
              return;
          }
      }

      const variables = parseInput(rawInput);
      const combinations = generateCombinations(variables);

      const table = combinations.map(combination => {
          const values = Object.fromEntries(variables.map((variable, idx) => [variable, combination[idx]]));
          const results = expressions.map(expr => {
              console.log("Processing input:", expr, "with values:", values);
              return evaluateExpression(expr, values);
          });
          return [...combination, ...results];
      });

      // Header contains variable names and all expressions
      table.unshift([...variables, ...expressions]);

      console.log(XLSX.version);
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(table);

      XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
      XLSX.writeFile(workbook, "test.xlsx");
  });
});