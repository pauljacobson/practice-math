// 1. Insert exercises into the page HTML
const container = (document.querySelector('.container'));
const num1 = document.querySelector('.num1');
const num2 = document.querySelector('.num2');
let operator = document.querySelector('.operator');
const operators = ['+', '-', '*', '/'];

// 2. Calculate random numbers

function randomNum(min, max) {
  min = Math.ceil(min);
  max = Math.ceil(max);
  return Math.floor(Math.random() * (max - min) -min);
}

// 3. Randomly select an operator


// 4. Populate the fields with randomly generated values
num1.textContent = randomNum(10, 999);
num2.textContent = randomNum(10, 999);

// 5. Randomly generate an operator but don't allow operators that lead to negative results
operator.textContent = operators[Math.floor(Math.random()*operators.length)];

// 5. Calculate the value of each randomly generated equation
