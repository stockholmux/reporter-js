/*
 * jQuery throttle / debounce - v1.1 - 3/7/2010
 * http://benalman.com/projects/jquery-throttle-debounce-plugin/
 * 
 * Copyright (c) 2010 "Cowboy" Ben Alman
 * Dual licensed under the MIT and GPL licenses.
 * http://benalman.com/about/license/
 */
(function(b,c){var $=b.jQuery||b.Cowboy||(b.Cowboy={}),a;$.throttle=a=function(e,f,j,i){var h,d=0;if(typeof f!=="boolean"){i=j;j=f;f=c}function g(){var o=this,m=+new Date()-d,n=arguments;function l(){d=+new Date();j.apply(o,n)}function k(){h=c}if(i&&!h){l()}h&&clearTimeout(h);if(i===c&&m>e){l()}else{if(f!==true){h=setTimeout(i?k:l,i===c?e-m:e)}}}if($.guid){g.guid=j.guid=j.guid||$.guid++}return g};$.debounce=function(d,e,f){return f===c?a(d,e,false):a(d,f,e!==false)}})(this);

/*jslint browser: true, devel: true, nomen: true, plusplus: true, regexp: true, sloppy: true, todo: true, vars: true, white: true */

function spreadsheetCellDecoder() {
  var
    toAlphabet,
    fromAlphabet,
    letters = "0ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    transform,
    getColumnName,
    getColumnIndex,
    parseRange;
  
  /* adapted from base.js - aseemk on github - MIT */
  toAlphabet = function (num, alphabet) {
    var base = alphabet.length;
    var digits = [];    // these will be in reverse order since arrays are stacks

    // execute at least once, even if num is 0, since we should return the '0':
    do {
        digits.push(num % base);    // TODO handle negatives properly?
        num = Math.floor(num / base);
    } while (num > 0);

    var chars = [];
    while (digits.length) {
        chars.push(alphabet[digits.pop()]);
    }
    return chars.join('');
  };
  
  fromAlphabet = function (str, alphabet) {
    var base = alphabet.length;
    var pos = 0;
    var num = 0;
    var c;

    while (str.length) {
        c = str[str.length - 1];
        str = str.substr(0, str.length - 1);
        num += Math.pow(base, pos) * alphabet.indexOf(c);
        pos++;
    }

    return num;
  };
  
  transform = function(i) {
      var mult = Math.floor(i / 26);
      return i + mult + 1;
  };
  
  getColumnName = function(i) {
    // i is the regular zero-indexed column index, e.g. 0, 1, ... 25, 26, 27, ...
    var j = transform(i);
    return toAlphabet(j, letters);
  };
  
  /* end bases.js code*/
  getColumnIndex = function(columnName) {
    return fromAlphabet(columnName,letters)-columnName.length;
  };
  
  parseRange = function(rangeString, source) {
    var
      colRegExp = /[A-Z]+/gi,
      rowRegExp = /\d+/gi,
      rangeParts = rangeString.split(':'),
      startCol = rangeParts[0].match(colRegExp)[0], endCol = rangeParts[1].match(colRegExp)[0],
      startRow = Number(rangeParts[0].match(rowRegExp)[0]), endRow = Number(rangeParts[1].match(rowRegExp)[0]),
      col,
      row,
      rows = [],
      aRow,
      cellValue;
    for (row = startRow; row <= endRow; row += 1) {
      aRow = [];
      for (col = getColumnIndex(startCol); col <= getColumnIndex(endCol); col += 1) {
        cellValue = source[getColumnName(col)+row];
        //no alpha word chars? it becomes a number
        if (!cellValue.match(/[a-z]/gi)) {
          cellValue = Number(cellValue);
        }
        aRow.push(cellValue);
      }
      rows.push(aRow);
    }
    
    return rows;
  };
  
  return {
    parseRange : parseRange,
    getColumnIndex : getColumnIndex,
    getColumnName : getColumnName
  };
}


$(document).ready(function(){
  var
    defaultChartOptions = {
      linechart : {
        legend : 'bottom'
      },
      areachart : {
        legend : 'bottom'
      }
    },
    cellDecoder = spreadsheetCellDecoder(),
    charts = [],
    makeChartFunction,
    stringifyRow = function(grid2d, row) {
      var
        i;
      for (i = 0; i < grid2d[row].length; i += 1) {
        if (grid2d[row]) {
          grid2d[row][i] = String(grid2d[row][i]);
        }
      }
      
      return grid2d;
    },
    stringifyCol = function(grid2d, col) {
      var
        i;
      
      for (i = 0; i < grid2d[1].length; i += 1) {
        if (grid2d[i]) {
          grid2d[i][col] = String(grid2d[i][col]);
        }
      }
      
      return grid2d;
    },
    drawCharts = function() {
      var
        i;
      for (i = 0; i < charts.length; i += 1) {
        charts[i]();
      }
    };
  
  
  makeChartFunction = function(options, fnName) {
    return function(){
      var
        data,
        cellData = stringifyCol(
          cellDecoder.parseRange($(this).attr('data-chart-values'),cells),
          0
        ),
        chart = new google.visualization[fnName](this);
      
      data = google.visualization.arrayToDataTable(cellData,0);
      charts.push(function() {
        chart.draw(data, options);
      });
    };
  };
  

  google.load("visualization", "1", {
      packages:["corechart"],
      callback: function() {
        $('.line-chart').each(
          makeChartFunction(
            typeof lineChartOptions === 'undefined' ? defaultChartOptions.linechart : $.extend(lineChartOptions, defaultChartOptions.linechart),
          'LineChart')
        );
        $('.area-chart').each(makeChartFunction(
          typeof areaChartOptions === 'undefined' ? defaultChartOptions.areachart : $.extend(areaChartOptions, defaultChartOptions.areachart),
          'AreaChart')
        );
        $('.column-chart').each(makeChartFunction({},'ColumnChart'));
        $('.pie-chart').each(makeChartFunction({},'PieChart'));
        $('.table-chart').each(function(){
          var
            tableRows = cellDecoder.parseRange($(this).attr('data-chart-values'),cells),
            $theTableHead = $('<thead />'),
            $theTableBody = $('<tbody />'),
            $theTable = $('<table />')
              .addClass('table table-striped table-hover')
              .append($theTableHead,$theTableBody),
            $aRow,
            colEls,
            rowEls = [],
            col,
            row;
          
          for (row = 0; row < tableRows.length; row += 1) {
            colEls = [];
            for (col = 0; col < tableRows[row].length; col += 1) {
              colEls.push($(row === 0 ? '<th />' : '<td />').html(tableRows[row][col]));
            }
            $aRow = $('<tr />');
            $aRow.append.apply($aRow,colEls);
            if (row === 0) {
              $theTableHead.append($aRow);
            } else {
              rowEls.push($aRow);
            }
            
          }
          $theTableBody.append.apply($theTable,rowEls);

          $(this).append($theTable);
        });
        
        drawCharts();
        $(window).on('resize orientationchange', $.debounce(250, drawCharts));
      }
    }
  );
  

});