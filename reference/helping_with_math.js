// This code is from https://www.helpingwithmath.com/printables/worksheets/WorksheetGenerator02.htm?operation=multiply
// It looks like it does something similar to what I'm working on.

var numRows;
var SaveableParameters = new Array(numRows);
var SettingsSaved = 0;
var operation;
var minValue1;
var maxValue1;
var minValue2;
var maxValue2; 
var maxValue3;
var theFormat;

var run_count = 0;
  
  //needed if there are any URL params to set the operation
  function getUrlVars() {
    var vars = {};
    var parts = window.location.href.replace(/[?&]+([^=&]+)=([^&]*)/gi, function(m,key,value) {
        vars[key] = value;
    });
    return vars;
  }
  
  function updateWorksheet()
  {
    if ( document.getElementById )
    {
	 //if this is the first time the page is loaded then look for url params and if found use
	 run_count ++;
     if (getUrlVars()["operation"] != undefined && run_count == 1)
	   {
	   var the_op = getUrlVars()["operation"];
	   document.getElementById(the_op).selected=true;
	   }
	  
	  // Get our operator...
      operation = document.getElementById( 'operation' ).value;
	  
      // Get our data range...
      minValue1 = document.getElementById( 'min1' ).value;
      maxValue1 = document.getElementById( 'max1' ).value;
      minValue2 = document.getElementById( 'min2' ).value;
      maxValue2 = document.getElementById( 'max2' ).value;
	  maxValue3 = document.getElementById( 'max3' ).value;
	  theFormat = document.getElementById( 'format' ).value;

      // Important layout settings...
       var numCols = document.getElementById( 'colsnum' ).value;
	   numRows = document.getElementById( 'rowsnum' ).value;
	  
	  var base_row_height = 95;
	  numRows = parseInt( numRows );
	  var row_height = Math.round(base_row_height / (numRows/8));
	  
	  var row_width = 70;
	 
	  numCols = parseInt( numCols );
	  switch (numCols)
		{
		case 5:
		   var cellStyle = "font-size:12pt;letter-spacing:2px; height:" + row_height + "px"; 
		break; 
		case 4:
		   var cellStyle = "font-size:16pt;letter-spacing:2px; height:" + row_height + "px"; 
		break;
		case 3:
		   var cellStyle = "font-size:18pt;letter-spacing:3px; height:" + row_height + "px"; 
		break;
		case 2:
		   var cellStyle = "font-size:22pt;letter-spacing:4px; height:" + row_height + "px"; 
		   row_width = 120;
		break;
		case 1:
		   var cellStyle = "font-size:30pt;letter-spacing:5px; height:" + row_height + "px"; 
		   row_width = 120;
		break;
		}
	  //make sure Max total is big enough
	  
	  minValue1 = parseInt( minValue1 );
    minValue2 = parseInt( minValue2 );
	  maxValue1 = parseInt( maxValue1 );
	  maxValue2 = parseInt( maxValue2 );
	  maxValue3 = parseInt( maxValue3 );
	 
	  maxValue3 = Math.max(maxValue1,maxValue2,maxValue3,minValue1,minValue2)  
	 
	 if (maxValue3 <= (minValue1 + minValue2))
	 {
	 maxValue3 = minValue1 + minValue2;
	 } 
	 
	 //put user-saveable parameters	into an array
     for (var i = SettingsSaved; i < numRows; i++) {
	   SaveableParameters[i] = new Array(7);

		 SaveableParameters[i][0] = operation;
		 SaveableParameters[i][1] = minValue1;
		 SaveableParameters[i][2] = maxValue1;
		 SaveableParameters[i][3] = minValue2;
		 SaveableParameters[i][4] = maxValue2;
		 SaveableParameters[i][5] = maxValue2;
		 SaveableParameters[i][6] = theFormat;
     }
	 
      // Start generating our worksheet table...
      var worksheetOutput = "";
	  worksheetOutput += '<table class="terrystable" align="center" border="0" cellpadding="0" cellspacing="2" width="650" height="90%">';
      for ( var i = 0; i < numRows; i++ )
      {
   
        worksheetOutput += '<tr>';
        for ( var j = 0; j < numCols; j++ )
        {
          // assign variables from array - could be tighter - doing this for ease of updating other generators
		operation = SaveableParameters[i][0];
		minValue1 = SaveableParameters[i][1];
		maxValue1 = SaveableParameters[i][2];
		minValue2 = SaveableParameters[i][3];
		maxValue2 = SaveableParameters[i][4];
		maxValue2 = SaveableParameters[i][5];
		theFormat = SaveableParameters[i][6];
		  
		  // Math.random() = value between 0.0 & 1.0...
          var valueOne = randomNumberRange( minValue1, maxValue1 );
          var valueTwo = randomNumberRange( minValue2, maxValue2 );

          var result;
		  var operator;
		  
		  switch (operation)
          {
		     case "+":
			 operator = "+";
			    do
				{
				var valueOne = randomNumberRange( minValue1, maxValue1 );
                var valueTwo = randomNumberRange( minValue2, maxValue2 );
				result = valueOne + valueTwo;
				}
			    while (result > maxValue3);
			  break;
			 
		     case "-":
			 //make sure first number is largest
			 if (valueOne < valueTwo)
			    {
				//exchange values
				var valueTemp = valueOne;
				valueOne = valueTwo;
				valueTwo = valueTemp;
				}
			 operator = "-";
			 result = valueOne - valueTwo;
			 break;
			 
		     case "x":
			 operator = "x";
			 result = valueOne * valueTwo;
			 break;
			 
			 case "+-":
			 //randomly set operator as plus or minus: 0 = + , 1 = -
			 var ran_number=Math.floor(Math.random()*2);
			    switch (ran_number)
				{
				  case 0:
			      operator = "+";
			    do
				{
				var valueOne = randomNumberRange( minValue1, maxValue1 );
                var valueTwo = randomNumberRange( minValue2, maxValue2 );
				result = valueOne + valueTwo;
				}
			    while (result > maxValue3);
			    break;
				  
			      case 1:
			    //make sure first number is largest
			     if (valueOne < valueTwo)
			       {
				   //exchange values
				   var valueTemp = valueOne;
				   valueOne = valueTwo;
				   valueTwo = valueTemp;
				   }
			     operator = "-";
			     result = valueOne - valueTwo;
			     break;
				 }

		  }

		     if ( theFormat == "line" )
	        //format this way for line format
	        {
             worksheetOutput += '<td class="terryscell" style="' + cellStyle + '" align="center" valign="middle" nowrap="nowrap">';
             worksheetOutput += '<p>';

             worksheetOutput += valueOne + ' ' + operator + ' ' + valueTwo + ' = ';
             worksheetOutput += '<span class="spacer">';
             worksheetOutput += '<span class="result">' + result + '</span>';
             worksheetOutput += '</span>';
             worksheetOutput += '</p>';
             worksheetOutput += '</td>';
		     }
		 
		    if ( theFormat == "stacked" )
	        //format this way for stacked format
	        {
             worksheetOutput += '<td class="terryscell" style="' + cellStyle + '" valign="top" nowrap="nowrap">';
		     worksheetOutput += '<div style="margin: 0 auto; width:' + row_width + 'px;"><div style="text-align:right; padding-top:2px;">';
		     worksheetOutput += valueOne + '<br /><span class="underlined">&nbsp;';
		     worksheetOutput += operator + ' ' + valueTwo + '</span><br /><span class="result">'+ result +'</span></div></div>';
             worksheetOutput += '</td>';
	        }
        }
        worksheetOutput += '</tr>';
      }
	   worksheetOutput += '</table>';

      // Output HTML to our DIV...
      document.getElementById( 'output' ).innerHTML = worksheetOutput;

      // And reveal demo...
      // showFirstResult();
    }
  }
  
   function saveSettings()
  {
  if (SettingsSaved == numRows)
  {
  alert ("No more Settings can be saved.");
  return;
  }
  
  SettingsSaved ++;
  
  var settingsOutput = "";
     for ( var m = 0; m < SettingsSaved; m++ )
	  {
	  if (m == SettingsSaved - 1)
	    {settingsOutput += '<span style="font-size: x-small;">Settings for Row ' + (m + 1) + ' Saved</span><br/>';}
	  else
	    {settingsOutput += '<span style="font-size: x-small;"><em>Settings for Row ' + (m + 1) + ' Saved</em></span><br/>';}
	  }
	     var i = SettingsSaved - 1; 
		 
		 SaveableParameters[i][0] = operation;
		 SaveableParameters[i][1] = minValue1;
		 SaveableParameters[i][2] = maxValue1;
		 SaveableParameters[i][3] = minValue2;
		 SaveableParameters[i][4] = maxValue2;
		 SaveableParameters[i][5] = maxValue2;
		 SaveableParameters[i][6] = theFormat;
		 
		  alert ("Settings have been saved for row " + SettingsSaved);
	  settingsOutput += '<form style="padding-top:10px;"><INPUT name="button" type="button" onClick="clearSettings();" value="Clear Saved Settings"></p></form>';
	   document.getElementById( 'savedsettings' ).innerHTML = settingsOutput;
  }
  
  function clearSettings()
  {
  var r=confirm("Delete saved row settings?");
   if (r==true) {
     SettingsSaved = 0;
     settingsOutput = "";
     document.getElementById( 'savedsettings' ).innerHTML = settingsOutput;
     updateWorksheet();
	 }
  }

  function showFirstResult()
  {
    if ( document.getElementById )
    {
      document.getElementById( '1' ).style.visibility = "visible";
    }
  }

  function showResults()
  {
    if ( document.getElementsByTagName )
    {
      var spans = document.getElementsByTagName( "span" );
      for( var i = 0; i < spans.length; i++ )
      {
        if ( spans[ i ].className.indexOf( "result" ) != -1 )
        {
            spans[ i ].style.visibility = "visible";
        }
      }
    }
  }

  function hideResults()
  {
    if ( document.getElementsByTagName )
    {
      var spans = document.getElementsByTagName( "span" );
      for( var i = 0; i < spans.length; i++ )
      {
        if ( spans[ i ].className.indexOf( "result" ) != -1 )
        {
            spans[ i ].style.visibility = "hidden";
        }
      }
    }
  }

  function printWorksheet()
  {
    if ( document.getElementById )
    {
      document.getElementById( 'design' ).style.visibility = "hidden";
      document.getElementById( 'reveal' ).style.visibility = "hidden";
      window.print();
      document.getElementById( 'design' ).style.visibility = "visible";
      document.getElementById( 'reveal' ).style.visibility = "visible";
    }
  }

  function randomNumberRange( minValue, maxValue )
  {
    var minValue = parseInt( minValue );
    var maxValue = parseInt( maxValue );
    return Math.round( Math.random() * ( maxValue - minValue ) ) + minValue;
  }