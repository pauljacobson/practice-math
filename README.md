# Practice Math

**I've deprecated this version in favour of [the Python Edition, over here](https://github.com/pauljacobson/practice-math-py).**

A site for kids to practice their math.

![Version 1](https://github.com/pauljacobson/practice-math/blob/master/app/assets/images/practice_math_v1.png)

Initially I was going to load a series of equations into the site and randomly present them to users. This would obviously involve a fair amount of work but, you know, it would have been for our children.

It then occurred to me that I could randomly generate values and populate pre-defined fields to create equations. Kids could then type in their answers, and have the system evaluate their answers based on the current values.

The site should also keep track of how the kids do in their session and give them a way to review their work.

## Functionality I'm aiming for

Here is an overview of what I have in mind:

![Rough overview of the app](https://github.com/pauljacobson/practice-math/blob/master/app/assets/images/pm_overview.png)

I'm aiming for the following functionality:

1. Randomly calculated number values and an operator (the format for the equations is "NUM1 OPERATOR NUM2 = INPUT_FIELD");
2. Populate the fields with the randomly generate values;
3. Calculate the solution of the equation, as it's generated each time;
4. Compare the user's input to the equation's solution, and return a "true" or "false" dependng on whether the answer was correct;
5. Give visual feedback based on the solution's accuracy (this will be a generated statement based on "true" or "false" in the previous item);
6. Save each result into local storage;
7. "Submit", "Next", and "Finish" buttons;
8. When the user clicks on the "Finish" button, a list of completed equations and responses will be presented below (along with feedback on which ones were answered correctly).

## Constraints

There are likely to be a couple of constraints.

### Whole, positive integers as answers

The first one that comes to mind is that the generated equations can't give rise to a solution with a -

* negative value; or
* fraction as an answer.

In other words, solutions need to be whole, positive integers.

This means that the choice of the first number and the operator must be made bearing in mind these constraints for the ultimate solution. Presumably this would involve a process along these lines:

1. Generate each of the number values and select an operator;
2. Determine whether the resulting equation produces a result that is a whole, positive integer?
3. If not, generate another equation until the result is a whole, positive integer.
4. Once the various values that meet these constraints are determined, insert them into the DOM.

The test would likely involve an `if ... then` function at the outset of the process of creating the equation. I'm just not sure where to go from there.
