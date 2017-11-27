// 1. Insert exercises into the page HTML
const categoryContainer = (document.querySelector('.cat1--container'));
console.log(categoryContainer);

const example1 = {
  var1: 24,
  var2: 6,
  var3: 4
};

categoryContainer.innerHTML = `<p>${example1.var1} / ${example1.var2} = ${example1.var3}</p>`;

// 2. Derive equations from an object containing exercise variables