/*jslint devel: true, node: true, nomen: true, regexp: true, sloppy: true, white: true */
var
  express = require('express'),
  extend = require('xtend'),
  jade = require('jade'),
  marked = require('marked'),
  request = require('request'),
  fs = require('fs'),
  multiline = require('multiline'),
  path = require('path'),
  rendered = {};
  
exports.jadeTemplate = multiline(function(){/*
doctype html
html(lang="en")
  head
    title= pageTitle
    script !{cellScript}
    script(src="//ajax.googleapis.com/ajax/libs/jquery/1.10.2/jquery.min.js")
    script(src=frontendJS)
    script(type="text/javascript",src="//www.google.com/jsapi")
    link(rel="stylesheet", href=stylesheetPath)
    meta(name='viewport',content='width=device-width, user-scalable=no')
  body
    .container
      != body
*/});

function mdHeadings() {
  var
    firstH1 = '';
    
  return {
    getFirstH1 : function() {
      return firstH1;
    },
    renderer : function(text, level, raw) {
      if ((level === 1) && (firstH1 === '')) {
        firstH1 = text;
      }
      return '<h'
        + level
        + ' id="'
        + this.options.headerPrefix
        + raw.toLowerCase().replace(/[^\w]+/g, '-')
        + '">'
        + text
        + '</h'
        + level
        + '>\n';
    }
  };
}

exports.apiPath = function(dockey) {
  return 'https://spreadsheets.google.com/feeds/cells/'+dockey+'/od6/public/values?alt=json';
};

exports.buildTemplate = function() {
  exports.template = jade.compile(exports.jadeTemplate);
};

exports.dockeyRegExp = /\=dockey:((\d|_|-|\w))+\=/g;
exports.cellRegExp = /\=[A-Z]{1,2}[0-9]+\=/g;
exports.linechartRegExp = /\=linechart,[A-Z]{1,4}[0-9]{1,4}\:[A-Z]{1,4}[0-9]{1,4}\=/g;
exports.areachartRegExp = /\=areachart,[A-Z]{1,4}[0-9]{1,4}\:[A-Z]{1,4}[0-9]{1,4}\=/g;
exports.columnchartRegExp = /\=columnchart,[A-Z]{1,4}[0-9]{1,4}\:[A-Z]{1,4}[0-9]{1,4}\=/g;
exports.piechartRegExp = /\=piechart,[A-Z]{1,4}[0-9]{1,4}\:[A-Z]{1,4}[0-9]{1,4}\=/g;
exports.tableRegExp = /\=tablechart,[A-Z]{1,4}[0-9]{1,4}\:[A-Z]{1,4}[0-9]{1,4}\=/g;


exports.extensions = ['.md','.markdown','.mdown'];

exports.liveSuffix = 'live';

exports.stylesheetPath = '/public/bootstrap.css';
exports.frontendJS = '/public/reporter.charts.js';

function convertChart(text, chartRegExp, chartClass) {
  var
    charts = text.match(chartRegExp),
    i;
    
  if (charts) {
    for (i = 0; i < charts.length; i += 1) {
      text = text.replace(charts[i],'<div class=\"'+chartClass+'\" data-chart-values=\"'+charts[i].split(',')[1]+'\"></div>');
    }
  }
  return text;
}

function serveMd(filename, forceLive) {
  return function(req,res) {
    var
      renderer,
      headings;
    
    if ((rendered[filename]) && (forceLive !== true)) {
      console.log('from memory');
      res.send(rendered[filename]);
    } else {
      console.log('live');
      headings = mdHeadings();
      renderer = new marked.Renderer();

      renderer.heading = headings.renderer;
      
      fs.readFile(filename, { encoding : 'utf8' }, function(err, text) {
        var
          outHtml,
          dockey;
  
        if (err) {
          console.log(err);
        } else {
          text = convertChart(text,exports.linechartRegExp,'line-chart');
          text = convertChart(text,exports.areachartRegExp,'area-chart');
          text = convertChart(text,exports.columnchartRegExp,'column-chart');
          text = convertChart(text,exports.piechartRegExp,'pie-chart');
          text = convertChart(text,exports.tableRegExp,'table-chart');
          
          
          dockey = text.match(exports.dockeyRegExp);
          if (dockey) {
            dockey = dockey[0];
            text = text.replace(dockey,'');
            dockey = dockey.slice(8,-1); 
            
            request({
                uri   : exports.apiPath(dockey),
                json  : true 
              }, function (error, response, data) {
              var
                i,
                cellScript,
                cells = {},
                cellMatches;
                
              if (!error && response.statusCode === 200) {
                
                for (i = 0; i < data.feed.entry.length; i += 1) {
                  cells[data.feed.entry[i].title.$t] =  data.feed.entry[i].content.$t;
                }
                
                cellMatches = text.match(exports.cellRegExp);
                
                if (cellMatches) {
                  cellMatches.forEach(function(aMatch) {
                    var
                      matchCell = aMatch.slice(1,-1);
                   
                    text = text.replace(new RegExp('\='+matchCell+'\=','gi'), cells[matchCell]);
                  });
                }
                
                cellScript = 'var cells = ' + JSON.stringify(cells);
               
                
                outHtml = marked(text, { renderer : renderer });
                
                rendered[filename] = exports.template({
                  body : outHtml,
                  pageTitle : headings.getFirstH1(),
                  cellScript : cellScript,
                  stylesheetPath : exports.stylesheetPath,
                  frontendJS : exports.frontendJS
                });
                
                res.send(rendered[filename]);
              } else {
                console.log('oops');
              }
            });
          } else {
            outHtml = marked(text, { renderer : renderer });
            res.send(exports.template({
              body : outHtml,
              pageTitle : headings.getFirstH1(),
              stylesheetPath : exports.stylesheetPath,
              frontendJS : exports.frontendJS
            }));
          }
        }
      });
    }
  };
}

exports.routes = function(app, directoryName, prefix) {
  fs.readdir(directoryName, function(err, cb) {
    cb.forEach(function(aFile){
      var
        ext = path.extname(aFile),
        fnameNoExt = path.basename(aFile, ext),
        route = prefix+fnameNoExt,
        routeLive = prefix+fnameNoExt+'/'+exports.liveSuffix;
      
      if (exports.extensions.indexOf(ext) !== -1) {
        if (fnameNoExt === 'index') {
          route = prefix;
          routeLive = prefix+exports.liveSuffix;
        }
        
        app.get(route, serveMd(directoryName+'/'+aFile));
        app.get(routeLive, serveMd(directoryName+'/'+aFile,true));
      }
    });
  });
};



exports.start = function(opts) {
  var
    defaults = {
      mdDirectory   : '/md',
      prefix        : '/',
      port          : 3200,
      staticDir     : __dirname + '/public',
      staticPath    :'/public'
    };
  
  opts = extend(defaults, opts);
  exports.app = express();
  exports.app.use(opts.staticPath, express.static(opts.staticDir));
  
  exports.buildTemplate();
  
  exports.routes(exports.app,opts.mdDirectory,opts.prefix);
  
  exports.app.listen(opts.port);
  console.log('ReporterJS started on',opts.port);
};