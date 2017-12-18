const container = (document.querySelector('.container'));
const eq = document.querySelector('.equation');
let operator;
const btnNext = document.querySelector('#btn_next');
const operators = ['+', '-', '*', '/'];
// const solutions = JSON.parse(localStorage.getItem('solutions')) || [];

// Calculate random numbers
function randomNum(min, max) {
  return Math.floor(Math.random() * 1000) + 1;
}

// Randomly select an operator
function selectOperator() {
  const randomOperator = operators[Math.floor(Math.random()*operators.length)];
  if (randomOperator === '+') {
    operator = '\u002B';
  } else if (randomOperator === '-') {
    operator = '\u002D';
  } else if (randomOperator === '*') {
    operator = '\u00D7';
  } else if (randomOperator === '/') {
    operator = '\u00F7';
  }
}

// Populate the fields with randomly generated values
function renderEquation() {
  selectOperator();
  const num1 = randomNum(10, 999);
  const num2 = randomNum(10, 999);
  eq.textContent = `
  ${num1} ${operator} ${num2}`;
}

renderEquation();

// Task: Randomly generate an operator but don't allow operators that lead to negative results

// Task: Calculate the value of each randomly generated equation


// Generate a new equation when the user clicks on the "Next" button
btnNext.addEventListener('click', renderEquation);