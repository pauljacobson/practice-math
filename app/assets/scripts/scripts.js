const container = (document.querySelector('.container'));
const eq = document.querySelector('.equation');
let operator;
const btnNext = document.querySelector('#btn_next');
const operators = ['+', '-', '*'];
// const solutions = JSON.parse(localStorage.getItem('solutions')) || [];

// 1. Calculate random numbers

function randomNum(min, max) {
  min = Math.ceil(min);
  max = Math.ceil(max);
  return Math.floor(Math.random() * (max - min) -min);
}

// 2. Randomly select an operator

// 4. Populate the fields with randomly generated values
function calcValues() {
  const num1 = randomNum(10, 999);
  const num2 = randomNum(10, 999);
  eq.textContent = `
  ${num1} ${operators[Math.floor(Math.random()*operators.length)]} ${num2}`;
}

// num1.textContent = randomNum(10, 999);
// num2.textContent = randomNum(10, 999);
// console.log(num1.textContent, num2.textContent);
// // If num1 is smaller than num2, only select the `+` or `*` operators
// if (parseInt(num1.textContent) < parseInt(num2.textContent)) {
//   console.log(`num1: ${num1.textContent}, num2: ${num2.textContent}`);
// } else {
//   return;
// }

calcValues();

// 5. Randomly generate an operator but don't allow operators that lead to negative results
// Function to create operator that we then call in calcValues() for the operator

// 5. Calculate the value of each randomly generated equation


// 6. Generate a new equation when the user clicks on the "Next" button
btnNext.addEventListener('click', calcValues);