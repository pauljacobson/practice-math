const container = (document.querySelector('.container'));
const num1 = document.querySelector('.num1');
const num2 = document.querySelector('.num2');
let operator = document.querySelector('.operator');
const btnNext = document.querySelector('#btn_next');
const operators = ['+', '-', '*', '/'];
// const solutions = JSON.parse(localStorage.getItem('solutions')) || [];

// 1. Calculate random numbers

function randomNum(min, max) {
  min = Math.ceil(min);
  max = Math.ceil(max);
  return Math.floor(Math.random() * (max - min) -min);
}

// 2. Randomly select an operator
operator.textContent = operators[Math.floor(Math.random()*operators.length)];

// 4. Populate the fields with randomly generated values
function calcValues() {
  num1.textContent = randomNum(10, 999);
  num2.textContent = randomNum(10, 999);
  console.log(num1.textContent, num2.textContent);
  // If num1 is smaller than num2, only select the `+` or `*` operators
  if (parseInt(num1.textContent) < parseInt(num2.textContent)) {
    console.log(`num1: ${num1.textContent}, num2: ${num2.textContent}`);
  } else {
    return;
  }
}

calcValues();

// 5. Randomly generate an operator but don't allow operators that lead to negative results

// 5. Calculate the value of each randomly generated equation


// 6. Generate a new equation when the user clicks on the "Next" button
btnNext.addEventListener('click', calcValues);