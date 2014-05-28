#!/usr/bin/env node

//"use strict";

var argv = require('optimist').argv;
var request = require('request');
var colors = require('colors');
var strip = require('strip');
 var fs = require('fs');

var csv = require('csv');

//var csv2 = require('ya-csv');

var async = require('async');

var simhash = require('simhash')('md5');

//var process = require('process');

var natural = require('natural'),
  tokenizer = new natural.WordTokenizer();

 //var html_strip = require('htmlstrip-native');

var Db = require('mongodb').Db,
    Server = require('mongodb').Server;

var train_db = new Db('train_dataDB', new Server('localhost', 27017), { w: 1 });
var vectorcollection = train_db.collection('vector', { w: 1 });
var taglist = train_db.collection('tags', { w: 1 });

vectorcollection.ensureIndex( { "Term": 1 }, { unique: true, dropDups: true }, function(error) {}  );     	//make field unique for auto deduping
taglist.ensureIndex( { "Tag": 1 }, { unique: true, dropDups: true }, function(error) {  if (error) { console.dir(error); } });     	//make field unique for auto deduping
//vectorcollection.ensureIndex( { "docs": 1 }, { unique: true, dropDups: true }, function(error) {}  );     	//make field unique for auto deduping


Object.size = function(obj) {         //function for getting size of object arrays    -- syntax for use: var x =  Object.size(myArray);
    var size = 0, key;				  
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var Mongo_loader = function() {

	//-----------------------------------------------------------
	function unique(arr) {  //find number of unique terms! er, I mean get matches!
		var hash = {}, result = [], total = 0;
		for ( var i = 0, l = arr.length; i < l; ++i ) {
			if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
				hash[ arr[i] ] = true;
				total++;
			}
		}
		return total;
	}

	//-----------------------------------------------------------


	function crunch() { 

		 train_db.open(function(err, train_db) {


		 	async.waterfall([   //time to do things one at a time

			 	function(callback) {   //LOAD SIMPLE DICTIONARY INTO ARRAY
			 		var the_taglist =[];

			 		taglist.find().toArray(function(err, items) {   //BUILD TAG DICTIONARY ARRAY
						if (err) { console.dir(err); }
						console.log('Number of tags in simple dictionary: ' + items.length);

						for(q in items){ the_taglist.push(items[q].Tag); }

						callback(null, the_taglist);

					});
			 		
				},


			 	function(taglist, callback) {   //PROCESS TEST SET IN CSV STREAM

			 		var the_stream = fs.createWriteStream('../../Data/submissionTEST2.csv', {flags: 'w'}); //create write stream and point towards output file
			 	//	var header = '"Id","Tags"' + '\n';
			 	//	stream.write(header);                                      //manually create header
			 			 	         		
        			var data;
		        	var __dirname = '../../Data',
						__inname = '/Test.csv',
						__outname = '/null_out.csv';
					csv()
						.from.path(__dirname+__inname, { delimiter: ',', escape: '"' })
						//.to.stream(fs.createWriteStream(__dirname+__outname))
						//.to.stream(fs.createWriteStream('charly.png'))
						.to.stream(fs.createWriteStream('data'))
						//.to.stream(process.stdout.write(), {end: false})
						//.to.array()
						.transform( function(row){
						  row.unshift(row.pop());
						  return row;
						})   
						.on('record', function(row,index){


							var Id = row[1];
							var title = row[2];
							var body = row[0];
							
							var candidates = [];
							var count = 0;




							async.waterfall([   //time to do things one at a time

								function(callback) {    				//PARSE TEST DATA

									

									var target_text = [];

									var filter_list = [">","<","/","?","[","]","!","@", ",", "^", "$", "(", ")","=","*","~","'", "\n"];

									var pre_target_text = title.concat(" ", body);   //combine body and title

									if(pre_target_text.length > 300) pre_target_text = pre_target_text.slice(0,299);

									pre_target_text = pre_target_text.toLowerCase();

									pre_target_text = pre_target_text.split(" ");     //split into array

									for(d in pre_target_text){   //filter out bad
										var decide = true;

										for(v in filter_list){
											if(pre_target_text[d].indexOf(filter_list[v]) != (-1)) decide = false;
										}

										if(target_text.indexOf(pre_target_text[d]) !== (-1)) target_text.push(pre_target_text[d]);

										else if(stopword(pre_target_text[d])) decide = false;

										else if(isNaN(pre_target_text[d]) === false) decide = false;

										if(decide === true) target_text.push(pre_target_text[d]);
									}



									callback(null, target_text);

								},

								function(target_text, callback) {       //PROCESS TEST DATA

									console.log("");

									console.log("**************NEW******************");
									//console.log("TARGET TEXT: " + target_text);

									var the_tags;
									var candidates=[];

									var top_five_index = [0,0,0,0,0];
									var top_five_tags = ["x","x","x","x","x"];

									var decide = false;

									for(u in taglist){    //FIND CANDIDATE TAGS IN TEST ROW

										var counter = 0;
										

										if(target_text.indexOf(taglist[u]) != (-1)){   //TEMPORARY STOP WORD FILTERS, REMOVE FROM DICTIONARY DB COLLECTION INSTEAD BEFORE PRODUCTION

											
									
											decide = false;

											for(var b = 0; b < target_text.length; b++){
												//console.log("TESTY");
												if(target_text[b] === taglist[u]){
													counter++;						//GET FREQUENCY AND PICK FIVE MOST FREQUENT CANDIDATES
													decide = true;
													//console.log("%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%");
													if(counter>1) console.log("GREAQTER THAN ONE:" + target_text[b]);


												}
											//	else console.log("!!!!!!!!!!!!!!!!!!!!!!!");

											}

											//console.log("COUNTER: " + counter);
											for(var g = 0; g < 5; g++){

														if (counter > top_five_index[g]){ 

															//console.log(taglist[u]);

															top_five_index.splice(g,1, counter);
															 

															top_five_tags.splice(g,1, taglist[u]);

															if(top_five_tags.length > 6){
																top_five_index.slice(0,5);
																top_five_index.slice(0,5); 
															}
															else if(top_five_tags.length < 5) top_five_tags.splice(g, 1, taglist[u]);														

															//g = 99;
														}

														
													
															
														  //********************************STOPPED HERE
													}

													if(top_five_tags.indexOf("x") != (-1)){

														top_five_tags = top_five_tags.slice(0, top_five_tags.indexOf("x"));
													}

													console.log("TOP FIVE: " + top_five_tags);
													console.log("TOP FIVE: " + top_five_index);
													


											if(decide === true)candidates = top_five_tags.join(" ");

											//candidates = top_five_tags; //WE PASS CANDIDATES TO NEXT FUNCTION THROUGH TAGLIST 

											

										}


									}
								   
									the_tags = candidates;
									console.log("OUTPUT: " + the_tags);

									if(Id === "Id"){ Id = '"Id"'; the_tags = 'Tags'; }

									console.log("ID: " + Id);
									callback(null, the_tags);

								},

								function(the_tags, callback) {       //WRITE TO OUTPUT FILE

									console.log("TEST***********");

									console.log("THE TAGS &&&&& : " + the_tags);
								

									the_stream.write(Id + ',"' + the_tags + '"' + '\n');  //***WRITE TO OUTPUT CSV FILE

									if(Id.toString().slice(5,7) === "10"){ 
										console.log(Id + ',"' + the_tags + '"' + '\n'); 
										count = 0; 
									}   //test output every 100 writes

									data = "";

									callback();   


								}]);  								

						})
						.on('close', function(count){
						  // when writing to a file, use the 'close' event
						  // the 'end' event may fire before the file has been written
						  the_stream.close();
						  callback();

						})
						.on('error', function(error){
						  console.log(error.message);
						});  

				
				}]);	

			}); 
    } 						
							
	function toptags() { 

		 train_db.open(function(err, train_db) {


		 	async.waterfall([   //time to do things one at a time

			 	function(callback) {   //LOAD SIMPLE DICTIONARY INTO ARRAY

			 		var taglist =["c#","php","java","javascript","android","jquery","python","c++","iphone","mysql","asp.net",".net","html","sql","objective-c","ios","ruby-on-rails","linux", "css","ruby","windows","wpf","sql-server", "regex", "database","xml","ajax","facebook","django","windows-7","eclipse","ruby-on-rails-3","networking","algorithm","vb.net","git","xcode","osx","ubuntu","calculus","visual-studio-2010","silverlight","html5","actionscript-3","multithreading","wordpress","perl","visual-studio","oracle","excel",".htaccess","svn","apache","wcf","string","sql-server-2008","forms","spring","flash","unit-testing","ipad","image","ling","scala","blackberry","vim","sharepoint","cocoa","http","centos","iis"];

			 		var taglist_for_search = taglist;

			 		for(p in taglist){

			 			taglist_for_search[p] = " " + taglist_for_search[p] + " ";

			 		 	taglist_for_search[p] = taglist_for_search[p].replace("-"," ");

			 		// 	console.log(taglist_for_search);

			 		 } 
			 		

			 		callback(null, taglist, taglist_for_search);
			 		
				},

			 	function(taglist_for_search, taglist, callback) {   //PROCESS TEST SET IN CSV STREAM

			 		var the_stream = fs.createWriteStream('../../Data/submissionTOPTAGS1.csv', {flags: 'w'}); //create write stream and point towards output file
			 	//	var header = '"Id","Tags"' + '\n';
			 	//	stream.write(header);                                      //manually create header
			 			 	         		
        			var data;
		        	var __dirname = '../../Data',
						__inname = '/Test.csv',
						__outname = '/null_out.csv';
					csv()
						.from.path(__dirname+__inname, { delimiter: ',', escape: '"' })
						//.to.stream(fs.createWriteStream(__dirname+__outname))
						//.to.stream(fs.createWriteStream('charly.png'))
						.to.stream(fs.createWriteStream('data'))
						//.to.stream(process.stdout.write(), {end: false})
						//.to.array()
						.transform( function(row){
						  row.unshift(row.pop());
						  return row;
						})   
						.on('record', function(row,index){

							var Id = row[1];
							var title = row[2];
							var body = row[0];
							
							var candidates = [];
							var count = 0;

							async.waterfall([   //time to do things one at a time

								function(callback) {    				//PARSE TEST DATA
									
									var the_tags = [];

									var target_text = title.concat(" ", body);   //combine body and title


									for(var a = 0; a < taglist.length; a++){



										if(target_text.indexOf(taglist_for_search[a]) !== (-1))  the_tags.push(taglist[a]); 
									}

								//	the_tags = the_tags.slice(0,5); //limit tag list per doc

									the_tags = the_tags.join(" ");


									if(Id === "Id"){ Id = '"Id"'; the_tags = 'Tags'; }

									//console.log("ID: " + Id);

									callback(null, the_tags);

								},

								function(the_tags, callback) {       //WRITE TO OUTPUT FILE


								//	console.log("Tags: " + the_tags);
								

									the_stream.write(Id + ',"' + the_tags + '"' + '\n');  //***WRITE TO OUTPUT CSV FILE

									if(Id.toString().slice(5,7) === "10"){ 
										console.log(Id + ',"' + the_tags + '"' + '\n'); 
										count = 0; 
									}   //test output every 100 writes

									data = "";

									callback();   


								}]);  								

						})
						.on('close', function(count){
						  // when writing to a file, use the 'close' event
						  // the 'end' event may fire before the file has been written
						  the_stream.close();
						  callback();

						})
						.on('error', function(error){
						  console.log(error.message);
						});  

				
				}]);	

			}); 
    } 						
							
	//-----------------------------------------------------------

     function vectorgen() {
		//console.log("test2");

		  train_db.open(function(err, train_db) {

        	vectorcollection.ensureIndex( { "Term": 1 }, { unique: true, dropDups: true }, function(error) {}  );     	//make field unique for auto deduping
			vectorcollection.ensureIndex( { "docs": 1 }, { unique: false, dropDups: false }, function(error) {}  );     	//make field unique for auto deduping
			taglist.ensureIndex( { "Tag": 1 }, { unique: true, dropDups: false }, function(error) {}  );     	//make field unique for auto deduping

            if (err) { console.dir(err); }
        		
        			var data = {};
		        	var __dirname = '../../Data',
						__inname = '/Train.csv',
						__outname = '/testout.csv';
					csv()
						.from.path(__dirname+__inname, { delimiter: ',', escape: '"' })
						.to.stream(fs.createWriteStream(__dirname+__outname))
						.transform( function(row){
						  row.unshift(row.pop());
						  return row;
						})
						.on('record', function(row,index){

				

							async.waterfall([   //time to do things one at a time

								//**BEGIN PARSE TEXT AND DITCH NUMBER HTML STOPWORDS ETC
								function(callback) {
								  	body_parse = strip(row[2]);
								  	body_parse = tokenizer.tokenize(body_parse);
								  	title_parse = tokenizer.tokenize(row[1]);


								  	var title_final=[];
								  	for(w in title_parse){ 
								  		title_parse[w] = title_parse[w].toLowerCase();
								  		if(!stopword(title_parse[w])&&isNaN(title_parse[w])){ title_final.push(title_parse[w]) }
								  	}   

								  	var body_final=[];
								  	for(w in body_parse){ 
								  		body_parse[w] = body_parse[w].toLowerCase();
								  		if(!stopword(body_parse[w])&&isNaN(body_parse[w])){ body_final.push(body_parse[w]) }
								  	}

								  	tags = row[0].split(" ");

								  	var hash = simhash(row[2]);

								  	hash = hash.join("");
								  	hash = parseInt(hash, 2).toString(16).slice(0,20); 
								//  	console.log(hash);


								 	data = {"hash" : hash, "Id" : row[3],"Title" : row[1], "Body" : row[2], "Tags" : tags, "Title_parsed" : title_final,  "Body_parsed" : body_final };

								 //	if( Math.random() > 0.9 ) console.log(data.Id);   //test output

								 	callback(null, data);
								},
								 	//END PARSING

								
						 	//BEGIN DB WRITING
						 		function(data, callback) {
						 	//**LOOP THROUGH TAGS
								async.forEach(data.Tags, function(a_tag, callback) { //loop through tags contained in doc object
											
								//	async.series([
    								//	function(callback){
									
											//**WRITE TO TAG VECTOR MAP AND DATA SCIENCE COLLECTION			
											vectorcollection.update({ Term: a_tag },    //write to workhorse data science dictionary
												{	
													$push: {docs: data.hash}
												}, {upsert: true}, function (err, document){
												 
												 	if( data.Id/100 === Math.round(data.Id/100) ){
												 		if (err) { console.log("Error on: " + a_tag + "  at doc: " + data.hash); /*console.dir(err); */ } 
												 	//	else console.log("WRITTEN: " + data.Id + "  at term: " + a_tag);   //test output
												 	//	callback(null);
												 	} 	


												 	taglist.update(
												 	{ Tag: a_tag },    //write to simple tag dictionary
												 	{ Tag: a_tag },    //write to simple tag dictionary
													{upsert: true}, 
													function (err, document){
															if (err) { console.dir(err); throw "anything";}
															else{ if( Math.random() > 0.95 ) console.log(a_tag);  callback(); }
														 																										
													});  



											});  
											

								}, function(err) {});		
							//**END LOOP THROUGH TAGS
						 	//END DB WRITING

							}]);					

						})
						.on('close', function(count){
						  // when writing to a file, use the 'close' event
						  // the 'end' event may fire before the file has been written

						})
						.on('error', function(error){
						  console.log(error.message);
						});  
			}); 
    } 	
    

    //-----------------------------------------------------------

     function vectorlist() {
     	console.log("CHECK VECTOR MAP");

     	var top_tags = [];
     	var top_tags_sorted = [];
     	var decide = false;
     	var decide2 = false;

        train_db.open(function(err, train_db) {

            if (err) { console.dir(err); }

            var above_print = 5;

            console.log('Document vector map terms'.yellow.bold);

            vectorcollection.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

                if (items.length === 0) { console.log('Empty here :('); }

                	
                console.log("First " + above_print +  " entried:");


                async.waterfall([   //time to do things one at a time

			 		function(callback) {   //LOAD SIMPLE DICTIONARY INTO ARRAY

		                for (i in items) { //display as you go //DISPLAY LAST 5

		                	if(items[i].docs !== undefined && items[i].docs.length > above_print){ top_tags.push(items[i]); console.log('"' + items[i].Term + '",');}
								//console.log('- - - - - - - - - - - - - - - -');
								//console.log(items[i].title.bold);				

						}
							
                 		callback(null, top_tags);

					},

					function(top_tags, callback) {       //PROCESS TEST DATA

						console.log("----------------------");

						top_tags.push({Term: "BLANKS", docs: []});  //blank end for sorting

						var temp;
				        for(var w = 0; w < top_tags.length-1; w++){
				        	console.log("TEST888");
					        var temp;

					        for(var g = 1; g < top_tags.length + 1; g++){
					        	
					        	if(top_tags[g] === undefined){}

					            else if(top_tags[g-1].docs.length < top_tags[g].docs.length){

					            	top_tags.splice(g-1,0,top_tags[g]);
					            	top_tags.splice(g+1,1);				            						                		
					            }  
					        }			               
					    }  

					    callback(null, top_tags);
					},

					function(top_tags, callback) {       //PROCESS TEST DATA

						var text_out="";

					    console.log("----------------------");

						for(var t = 0; t < top_tags.length; t++){             
					        console.log(top_tags[t].Term + " , " + top_tags[t].docs.length);   	
					        text_out = text_out + '"' +  top_tags[t].Term + '",';	
						}	

						fs.writeFile('../../Data/top_tag_list_big.txt', text_out, function(err) {
						    if(err) {
						        console.log(err);
						    } else {
						        console.log("The file was saved!");
						    }
						}); 
						console.log("Number of terms that occue above " + above_print + " : " + top_tags.length);
						console.log('Number of terms in document vector map: ' + items.length);
					}]);  	

	            	
				
				
				
               setTimeout(function() { train_db.close(); }, 1000); 

            });
        });
    } 	

        //-----------------------------------------------------------

     function dictionarylist() {

        train_db.open(function(err, train_db) {

            if (err) { console.dir(err); }

            console.log('Simple tag dictionary entries: '.yellow.bold);

            taglist.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

                if (items.length === 0) { console.log('Empty here :('); }


                console.log("First 50 entried:");
                for (var i = 100; i < 1150 ; i++) { //display as you go 

					console.log('- - - - - - - - - - - - - - - -');
					//console.log(items[i].title.bold);	
					console.log(items[i]);   						
                }  
				
				console.log('Number of tags in simple dictionary: ' + items.length);
				
               setTimeout(function() { train_db.close(); }, 1000); 

            });
        });
    } 	

     //-----------------------------------------------------------

     function vectortest() {
     	console.log("CHECK VECTOR MAP");
     	var searchtag = process.argv[3];

        train_db.open(function(err, train_db) {

            if (err) { console.dir(err); }

            console.log('Document vector map terms'.yellow.bold);

            vectorcollection.find({Term:searchtag}).toArray(function(err, found_items) {

                if (err) { console.dir(err); }

                if (found_items.length === 0) { console.log('Not found in DB'); }

                console.log("Found in DB (#>1 = dupes): " + found_items.length);
                for (var i = 0; i < found_items.length ; i++) { //display as you go //DISPLAY LAST 5

					console.log('- - - - - - - - - - - - - - - -');
					//console.log(items[i].title.bold);	
					console.log(found_items[i]);   						
                }  
                console.log("Found in DB (#>1 = dupes): " + found_items.length);

            });
        });
    } 	

        //-----------------------------------------------------------
    
	function natural() {
		console.log(tokenizer.tokenize("your dog has flees."));



	/*	//STRIP HTML
		var html = '<style>b {color: red;}</style>' +
		                         ' Yey, <b> No more, tags</b>' +
		                         '<script>document.write("Hello from Javascript")</script>';
		var options = {
		        include_script : false,
		        include_style : false,
		        compact_whitespace : true
		    };

		    // Strip tags and decode HTML entities
		var text = html_strip.html_strip(html,options);
		console.log(text)
		*/
        train_db.open(function(err, train_db) {

            if (err) { console.dir(err); }

            vectorcollection.find().toArray(function(err, vectors) {  //query our entire dictionary collection

                if (err) { console.dir(err); }

                natural.BayesClassifier.load('classifier.json', null, function(err, classifier) {
				    console.log(classifier.classify('long SUNW'));
				    console.log(classifier.classify('short SUNW'));
				});


                vectors.forEach(function(vector) {    //loop through our dictionary of tag objects

                	var counter = 0;

                	vector.docs.forEach(function(doc_id) {	//loop through docs refenced in tag vector

                		collection.find({Id: doc_id}).toArray(function(err, the_doc) {   //find the doc so we can get body/title text

                			classifier.addDocument(the_doc.Body, a_tag);   //add document text to classier and associate it with tag
			
							setTimeout(function() {	counter++}, 200);												

						});
					});

					if(counter === vector.docs.length) classifier.train();  //train tag specific classifier once we've loaded all associated docs

                });

            });

       

        });  

    } 

    //-----------------------------------------------------------
    
		function vectorpurge() {

        train_db.open(function(err, train_db) {


            if (err) { console.dir(err); }

            vectorcollection.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

				items.forEach(function(item) {
				
					    vectorcollection.remove( item, function(err, doc) {});
				                						
				});
               
				console.log('ALL DATA REMOVED FROM VECTOR MAP COLLECTION');
                setTimeout(function() { train_db.close(); }, 2000); 

            });

        });

    } 

      //-----------------------------------------------------------
    
		function dictionarypurge() {

        train_db.open(function(err, train_db) {


            if (err) { console.dir(err); }

            taglist.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

				items.forEach(function(item) {
				
					    vectorcollection.remove( item, function(err, doc) {});
				                						
				});
               
				console.log('ALL DATA REMOVED FROM SIMPLE DICTIONARY COLLECTION');
                setTimeout(function() { train_db.close(); }, 2000); 

            });

        });

    } 


    //-----------------------------------------------------------


	function hardpurge() {

         train_db.open(function(err, db) {

            if (err) { console.dir(err); }

            taglist.remove( function(err, doc) {

                console.log("ALL DATA REMOVED FROM COLLECTION");
            //    db.close();
				
				vectorcollection.remove( function(err, doc) {

					console.log("ALL DATA REMOVED FROM TREFERENCE");

						 train_db.close();
				});
            });		
	//	db.close();
        });
    }


    //-----------------------------------------------------------


	function dbopen() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

        });
		
		console.log('DATABASE OPENED');

    }
	
	function dbclose() {

		db.close();
		console.log('DATABASE CLOSED');
    }


	//-----------------------------------------------------------
	
    function help() {
        console.log('CSV to Mongo and preprocessing');
        console.log('Usage:');
		console.log('$ --crunch  // apply algos and write submission');
		console.log('$ --toptags  // apply algos and write submission');
		console.log('$ --vectorgen  // generate tag dictionary + vector map');
        console.log('$ --trainlist  // review data');
        console.log('$ --vectorlist  // review vector map');
        console.log('$ --vectortest <search term>  // lookup tags in dictionary');
        console.log('$ --vectorpurge  // empty vector map collection');
        console.log('$ --dictionarylist  // review simple tag dictionary collection');
        console.log('$ --dictionarypurge  // empty simple dictionary collection');
        console.log('$ --natural  // npm natural test function');
        console.log('$ --hardpurge  // hard collection removal');
        console.log('$ --help  // command menu');
		console.log('spool site options: "indeed", "cl", "gov", "monster"');
        console.log('Conan, what is best in life? To crush your enemies, see them driven before you, and hear the lamentations of the women!'.rainbow);
    }

    return {
        vectortest: vectortest,
        vectorlist: vectorlist,
        vectorgen: vectorgen,
        crunch: crunch,
        toptags: toptags,
		dictionarylist: dictionarylist,
		dictionarypurge: dictionarypurge,
		natural: natural,
		vectorpurge: vectorpurge,
		hardpurge: hardpurge,
        help: help
    };

    function stopword(the_word){
    	var stop_words=["a","able","about","above","abroad","according","accordingly","across","actually","adj","after","afterwards","again","against","ago","ahead","aint","all","allow","allows","almost","alone","along","alongside","already","also","although","always","am","amid","amidst","among","amongst","an","and","another","any","anybody","anyhow","anyone","anything","anyway","anyways","anywhere","apart","appear","appreciate","appropriate","are","arent","around","as","as","aside","ask","asking","associated","at","available","away","awfully","b","back","backward","backwards","be","became","because","become","becomes","becoming","been","before","beforehand","begin","behind","being","believe","below","beside","besides","best","better","between","beyond","both","brief","but","by","came","can","cannot","cant","cant","caption","cause","causes","certain","certainly","changes","clearly","cmon","co","co.","com","come","comes","concerning","consequently","consider","considering","contain","containing","contains","corresponding","could","couldnt","course","cs","currently","d","dare","darent","definitely","described","despite","did","didnt","different","directly","do","does","doesnt","doing","done","dont","down","downwards","during","e","each","edu","eg","eight","eighty","either","else","elsewhere","end","ending","enough","entirely","especially","et","etc","even","ever","evermore","every","everybody","everyone","everything","everywhere","ex","exactly","example","except","f","fairly","far","farther","few","fewer","fifth","first","five","followed","following","follows","for","forever","former","formerly","forth","forward","found","four","from","further","furthermore","g","get","gets","getting","given","gives","go","goes","going","gone","got","gotten","greetings","h","had","hadnt","half","happens","hardly","has","hasnt","have","havent","having","he","hed","hell","hello","help","hence","her","here","hereafter","hereby","herein","heres","hereupon","hers","herself","hes","hi","him","himself","his","hither","hopefully","how","howbeit","however","hundred","i","id","ie","if","ignored","ill","im","immediate","in","inasmuch","inc","inc.","indeed","indicate","indicated","indicates","inner","inside","insofar","instead","into","inward","is","isnt","it","itd","itll","its","its","itself","ive","j","just","k","keep","keeps","kept","know","known","knows","l","last","lately","later","latter","latterly","least","less","lest","let","lets","like","liked","likely","likewise","little","look","looking","looks","low","lower","ltd","m","made","mainly","make","makes","many","may","maybe","maynt","me","mean","meantime","meanwhile","merely","might","mightnt","mine","minus","miss","more","moreover","most","mostly","mr","mrs","much","must","mustnt","my","myself","n","name","namely","nd","near","nearly","necessary","need","neednt","needs","neither","never","neverf","neverless","nevertheless","new","next","nine","ninety","no","nobody","non","none","nonetheless","noone","no-one","nor","normally","not","nothing","notwithstanding","novel","now","nowhere","o","obviously","of","off","often","oh","ok","okay","old","on","once","one","ones","ones","only","onto","opposite","or","other","others","otherwise","ought","oughtnt","our","ours","ourselves","out","outside","over","overall","own","p","particular","particularly","past","per","perhaps","placed","please","plus","possible","presumably","probably","provided","provides","q","que","quite","qv","rather","rd","re","really","reasonably","recent","recently","regarding","regardless","regards","relatively","respectively","right","round","said","same","saw","say","saying","says","second","secondly","see","seeing","seem","seemed","seeming","seems","seen","self","selves","sensible","sent","serious","seriously","seven","several","shall","shant","she","shed","shell","shes","should","shouldnt","since","six","so","some","somebody","someday","somehow","someone","something","sometime","sometimes","somewhat","somewhere","soon","sorry","specified","specify","specifying","still","sub","such","sup","sure","t","take","taken","taking","tell","tends","th","than","thank","thanks","thanx","that","thatll","thats","thats","thatve","the","their","theirs","them","themselves","then","thence","there","thereafter","thereby","thered","therefore","therein","therell","therere","theres","theres","thereupon","thereve","these","they","theyd","theyll","theyre","theyve","thing","things","think","third","thirty","this","thorough","thoroughly","those","though","three","through","throughout","thru","thus","till","to","together","too","took","toward","towards","tried","tries","truly","try","trying","ts","twice","two","u","un","under","underneath","undoing","unfortunately","unless","unlike","unlikely","until","unto","up","upon","upwards","us","use","used","useful","uses","using","usually","v","value","various","versus","very","via","viz","vs","w","want","wants","was","wasnt","way","we","wed","welcome","well","well","went","were","were","werent","weve","what","whatever","whatll","whats","whatve","when","whence","whenever","where","whereafter","whereas","whereby","wherein","wheres","whereupon","wherever","whether","which","whichever","while","whilst","whither","who","whod","whoever","whole","wholl","whom","whomever","whos","whose","why","will","willing","wish","with","within","without","wonder","wont","would","wouldnt","x","y","yes","yet","you","youd","youll","your","youre","yours","yourself","yourselves","youve","z","zero","XX", "salary", "job", "A", "jobs","cover","letter","contact","tool","role","person","apply","salary","history","requirements","education","history","ability","skill","proficiency","work","road","street","place","suite","room","time","skills","performance","experience","representation","excellent","time","relationship","somebody","participate","participation","quality","responsible","responsibilities","qualify","qualifications","capacity","country","issue","issues","order","user","position","equivalent","knowledge","supports","candidates","duties","duty","include","facility","candidate","summary","people","familiar","familiarity","request","requests","primary","secondary","employee","employees","employ","employer","employment","relationship","relationships","one","two","three","four","five","six","seven","eight","nine","ten","preferred","compensation","compensate","functions","function","year","years","month","months","day","days","commitment","willingness","application","follow","values","growth","belief","culture","require","required","mission","program","programs","substantial","organization","description","information","background","backgrounds","company","companys","initiative","questions","question","answer","answers","follow","following","interview","interviews","posses","report","reports","right","left","everyone","decision","decisions","benefit","benefits","presence","opportunity","thousand","million","word","interest","talent","talented","talents","today","todays","countries","identity","level","value","sense","task","tasks","location","ideal","must","date","standard","standards","detail","details","emphasis","basis","hours","communication","orientation","management","materials","flexibility","opportunities","responsibility","office","print","you'll","applicants","applicant","attention","services","status","expertise","activity","activities","characteristics","expenses","title","applications","professionals","professional","service","department","aptitude","minute","result","email","emails","availability","employers","offices","expense","first","other","valid","type","both","base","setup","area","needed","need","support","qualities","staff","others","none","term","decisiveness","consideration","group","groups","world","personal","personnel","dedication","individual","individuals","supplies","conduct","competency","teamwork","positions","facilities","integrity","change","excellence","productivity","difficulty","relations","relation","state","action","projects","open","strong","direction","high","face","were","such","idea","ideas","thats","at","dont","stuff","things","well","will","trust","nice","mind","care","have","youd","pair","part","wage","terms","areas","focus","point","works","asset","items","professionalism","functionality","including","volume","diligence","integral","openings","desire","basic","arent","share","array","meets","essential","equal","quality","identification","full","flow","sites","final","sets","side","reference","whom","when","number","discipline","capabilities","appropriate","life","line","member","extent","career","concepts","purpose","conditions","objectives","additional","satisfaction","NOTE","online","qualification","selection","preference","vacation","abilities","processes","resource","numbers","human","below","character","center","resume","which","more","proof","item","multiple","eligibility","operations","submission","includes","view","form","page","career","minimum","more","red","yellow","blue","orange","black","white","titles","salary","worker","basis","click","unit","above","new","behavior","products","past","someone","check","offer","short","use","visit","over","hour","selfstarter","insight","religion","priority","monday","tuesday","thursday","friday","saturday","sunday","january","february","march","april","may","june","july","august","september","october","november","december","second","changes","sample","enter","sames","links","control","period","dates","large","north","shift","event","link","lots","XX", "anticipation", "season", "business", "relationship", "com", " ", "peak", "dispute", "order", "perseverance", "vibrance", "WWW", "revenue", "sale", "city", "NY", "advisory","strategy","major","processe","proposal","requisition","master","data","article","agency","analytic","enablement","salary","0","12:00 PM","00 p m","00 telecommute option","00 vacancy","000 discou","000 employees","000 employees bp","000 people","000 stores","1a","a","abilities","abilities ability","abilities knowledge","abilities ksas","ability","ability ability","able","about","above","absence","abst","acceptance","access","accident","accommodation","accommodations","accomplishment","accomplishments","accordance","according","accordingly","accountabilities","accountability","accreditation","accredited","accredited institution","accredited school","accredited university","accuracy","achievement","achievements","acquisition","across","act","action","action employer","action employer m f","action employer m f v","action plans","actions","activities","activities customers","activity","activity requirements","actually","acuity","acumen","adaptability","added","addition","additional","address","address issues","addresses","adequacy","adherence","adj","adjustments","admission","adoption","adult","adults","advanc e","advance","advancement","advancement opportunities","advances","advantage","advice","advocate","af dcips employees","affairs","affected","affecting","affects","after","afterwards","again","against","age","age groups","age sex","agencies","agility","ago","agreement","agreements","ah","aids","alabama","albuquerque","alignment","all","allocation","almost","alone","along","already","also","alternative","alternative format","alternatives","although","always","am","america","american","americans","america's","among","amongst","amoungst","amount","amounts","amp","an","analysis","and","announce","announcement","annuitants applicants","annuitants click","another","answer","answer questions","answers","answers button","antonio","any","anybody","anyhow","anymore","anyone","anything","anyway","anyways","anywhere","apparently","appearance","applicant","applicant pool","applicants","application","application materials","application process","application questionnaire","application status","applications","apply","apply'","appointments","appreciation","approach","approaches","appropriate","appropriateness","approval","approvals","approximately","april","aptitude","are","area","areas","aren","arent","arise","arizona","arm","around","arrangements","array","as","asap","aside","ask","asked","asking","asks","asp","aspect","aspects","assemblies","assessment","assessment questionnaire","assessments","asset","assets","assignment","assignments","assistance","associates","association","assortment","assumptions","assurance","at","atlanta","attainment","attendance","attention","attitude","attributes","audience","audiences","august","austin","auth","authorities","authority","authorization","availability","available","award","awards","awareness","away","awfully","az","b","back","backed","background","background check","background checks","background investigation","backgrounds","backing","backs","baltimore","bar","barriers","base","base salary","basic","basis","be","became","because","become","becomes","becoming","been","before","beforehand","began","begin","beginning","beginnings","begins","behalf","behavior","behind","being","beings","belief","beliefs","believe","below","benefit","benefit package","benefits","benefits package","beside","besides","best","better","between","beyond","big","bill","billion","billion fortune","biol","bit","black","block","blue","board","bodies","body","bonus","bonuses","both","bottom","boundaries","box","bp group","branch","branch performance","breadth","brief","briefly","broadband communications consumer devices healthcare","bsn","buffalo","business","business days","business hours","business partners","business relationships","business waterworks job type","but","button","by","c","c c","ca","calendar","calendar days","california","call","came","campus site","can","canada","candidate","candidates","cannot","cant","can't","capabilities","capability","capacities","capacity","capital","card","cardboard","care","care st vincent","career","career move we're","career opportunities","career opportunity","career path","careerbuilder","careers","carolina","carrier position","cart","carts","case","case basis","caseload","cases","cash fund","categories","category","cause","causes","cdl","center","centers","century","certain","certainly","certificate","certification","certifications","cf industries","cfr","chain","challenge","challenges","chance","change","changes","channels","character","characteristics","charge","charges","charlotte","check","chicago","choice","circumstances","cities","citizen","citizenship","city","clarification","clarity","class","classes","classification","cleanliness","clear","clearly","click","'click","client","client relationships","client requirements","clients","close","closure","co","co workers","coast","code","codes","collaboration","colleagues","colleague's","collection","collections","college","college degree","columbia","com","combination","come","comes","comfort","comfort level","command","comments","commission","commitment","commitments","committee","commonwealth","communicates","communication","communication skills","communication skills ability","communication skills both","communication skills experience","communicator","communities","community","companies","company","company description","company guidelines","company policies","company policy","company security practices","company standards","companys","company's","compensate","compensation","compensation package","compensation packages","competence","competencies","competency","competition","completeness","completion","complexity","compliance","composure","con","concentration","concept","concepts","concerns","conclusion","conclusions","condition","conditions","conduct","confidence","configure","conflict","conformance","conjunction","connection","connections","consideration","considerations","consistency","constraints","consultant","consultants","contact","contact information","contacts","contain","containing","contains","content","contents","context","continuity","continuum","contractors","contribution","contributions","contributor","control","controls","conversation","conversations","conversion","cooperation","coordinates","coordination","copies","copy","core","core competencies","core values","corp","correction","corrections","correspondence","correspondence ability","cost","could","couldnt","council","countertop plan","counties","countries","countries invista","country","country's","county","course","course work","courtesy","cover","cover letter","cover page","coverage","coworkers","creation","creativity","credentials","credibility","criteria","cross","crouch","crowd","crumbs","cry","culture","curriculum","curriculum vitae","customer","customer requirements","customer service leadership","customers","customer's","customers ability","cv","cycle","d","dallas","damage","date","date applicants","dates","day","days","dc","de","deadline","deadlines","deadlines ability","deal","december","decision","decision makers","decisions","decisiveness","dedication","defense te connectivity","deficiencies","definition","degree","degree level","degrees","delivery","demand","demands","demeanor","demonstration","denver","department","department policies","departments","deployment","deposit","depth","depth experience","depth knowledge","describe","description","description job summary","desire","desk","destination","detail","detail ability","details","determination","dev panda","development","developments","dice","did","didn't","differ","difference","differences","different","differently","difficulties","difficulty","dignity","diligence","diploma","direction","directions","directives","disabilities","disabilities act","disability","disability persons","discharge","discipline","disciplines","discounts","discovery","discrepancies","discretion","discrimination","discussions","display","displays","disposal","disposition","disqualification","dissemination","distance","distribution","district","diversity","division","divisions","do","documentation","documents","documents section","dod","dod policy","does","doesn't","doing","done","dont","don't","doors","down","downed","downing","downs","downwards","draft","drawer","drive","drives","drop shipment categories","drug","drug screen","drug test","drug use","drugs","due","duluth","duration","during","duties","duties amp responsibilities","duties responsibilities","duty","duty service","e","e mail","each","early","ecc","ed","edge","edu","education","education bachelor","education credentials","education degree","education education","education experience","education experience skills","education program","education requirement","education requirements","eeo","eeo aa employer m f","effect","effectiveness","effects","efficiencies","efficiency","effort","efforts","eg","eight","eighty","either","element","elements","eleven","eligibilities","eligibility","eligibility documentation sf","eligibility qualifications","eligibility requirements","else","elsewhere","email","email notification","email subject line","emails","emergency","emphasis","employ","employee","employee encounters","employee handbook","employees","employer","employer job code","employers","employment","employment authorization","employment eligibility","employment i e hours","employment opportunities","employment opportunity","employment relationship","empty","end","ended","ending","ends","enforcement","engagement","engagements","engages","english","english both","english language","enhancement","enhancements","enough","enrollment","enter","enterprises","enthusiasm","entities","entries","entry","environment","environments","eoe","equal","equivalent","equivalent ability","equivalent combination","equivalent education","equivalent experience","equivalent work experience","errors","escalation","especially","essential","establishment","estimates","et","et-al","etc","ethics","evaluation","evaluation criteria","evaluations","even","evenings","evenings weekends","evenly","event","events","ever","every","everybody","everyone","everything","everywhere","evidence","evolution","ex","examination","example","examples","excellence","excellent","except","exception","exceptions","exchange","execution","exercise","exercise selection priority","exhibit","expansion","expectation","expectations","expense","expenses","experience","experience applicants","experience click","experience credit","experience education","experience equivalent","experience experience","experience knowledge","experience one","experience qualifications","experience requirements","experiences","expert","expert knowledge","expertise","exposure","expression","ext","extension","extent","extremities","f","face","faces","facets","facilities","facility","fact","factor","factors","facts","failure","faith","fall","familiar","familiarity","families","far","fax","fax number","fax transmission","fda","feasibility","features","february","fee","feedback","fees","fellow employees","felt","few","ff","field","fields","fifteen","fifth","fify","figures","fill","final","find","findings","finds","finger","fingers","fire","firm","first","first day","first year","five","five years","five years experience","fix","fl","flexibility","florida","flow","fluency","focus","follow","followed","following","follows","for","force","forefront","form","former","formerly","fort","forth","fortune","forty","found","foundation","four","four digits","four year college","four years","freedom","frequency","fri","friday","friend","friends","from","front","fryer","fulfillment","full","fully","fumes","fun","function","functionality","functions","fundamentals","further","furthered","furthering","furthermore","furthers","future","fx","g","g e","ga","gain","gainesville","galleria","gaps","gave","general","generally","generation","geography","georgia","get","gets","getting","give","given","gives","giving","globe","go","goal","goals","goes","going","gone","good","goods","got","gotten","gpa","grade","grade level","graduate","graduates","graduation","gram implementation","great","greater","greatest","greensboro","ground","grounds","group","grouped","grouping","groups","growth","growth opportunities","growth opportunity","gt","guest","guidance","guide","guidelines","h","had","hand","hands","happens","hardly","has","hasnt","hasn't","have","haven't","having","hazards","he","health care reimbursement","healthcare provider","hed","hence","her","here","hereafter","hereby","herein","heres","hereupon","heritage","hers","herself","hes","hi","hid","high","higher","highest","hills","him","himself","his","history","hither","holiday","holidays","home","home office","honesty","hope","hour","hour shifts","hours","hours day","houston","how","howbeit","however","hr","hrs","human","hundred","hundreds","hz","i","i e","icd","id","idea","ideal","ideas","identification","identity","ie","if","ii","i'll","illinois","im","image","immediate","immediately","impact","impacts","implementation","implements","implications","importance","important","improvement","improvements","in","inc","incentives","inception","incidents","include","includes","including","inclusion","increase","incumbents","indeed","independence","index","individual","individuals","industries","industry","industry experience","industry leader","industry's","influence","information","information ability","information click","initiation","initiative","initiatives","innovation","innovations","input","inquiries","insight","insights","inspection","installation","instead","institute","institutes","institution","institutions","instruction","instructions","integral","integral part","integrity","intent","interaction","interactions","interest","interested","interesting","interests","interfaces","interpretation","interruptions","intervention","interventions","interview","interview process","interviews","into","introduction","invention","investigation","involvement","inward","is","isn't","issuance","issue","issues","it","itd","item","items","it'll","its","it's","itself","i've","j","j m smucker company","jacksonville","january","jersey","job","job announcement","job applicants","job block","job block view","job description","job descriptions","job details","job duties","job experience","job function","job functions","job id","job knowledge","job number","job offer","job qualifications","job qualifications completion","job requirements","job requirements page","job requirements page ability","job responsibilities","job summary","job title","jobs","judgment","july","jun","june","just","k","k n owl e dge","k plan","k retirement plan","kansas","keep","keeps","kept","kg","kind","kinds","km","knew","know","knowledge","knowledge experience","knowledge skill","knowledge skills","knowledge skills abilities","knowledge skills amp abilities","known","knows","ky","l","l e m pl oym e nt","large","largely","las","last","lately","later","latest","latitude","latter","latterly","lbs","lead","lead capacity","leader","leaders","leadership","learner","learners","least","left","length","less","lessons","lest","let","lets","letter","letters","level","level experience","levels","leverage","leverages","liaison","license","lieu","life","lifestyle","lights","like","liked","likely","limit","limitations","limits","linde group","line","lines","link","links","list","list air force employee","lists","little","lives","'ll","llc","location","locations","log","long","longer","longest","look","looking","looks","losses duties","lot","lots","louis","love","ltd","m","made","mainly","maintenance","majority","make","makes","making","man","manageability","management","manhattan","manner","manner ability","manuals","many","march","masters degree","material","materials","matter","matters","may","maybe","md","me","meals","mean","means","meantime","meanwhile","measure","medium","meetings","meets","member","members","membership","memphis","men","menu","merchandise order zones","merchandise presentation guidance work experience","merely","message","messages","method","methodology","methods","mexico","mg","mh","mi","michigan","middle","midnight","might","miles","milestones","mill","million","million people","millions","milwaukee","mind","mine","minimum","minneapolis","minnesota","minorities","minute","minutes","miss","mission","mission statement","missouri","mix","ml","mn","mo","modification","modifications","modules","monday","monies","monitors","monster","month","month contract","month end","month year","months","months basis","months experience","more","moreover","mos afsc","most","mostly","motivation","move","movement","mr","mrs","much","mug","multi","multiple","multitask","murray","must","my","myself","n","na","name","name address phone number","namely","names","nation","nation's","nature","nay","nd","near","nearly","necessarily","necessary","need","needed","needing","needs","neither","networks","never","nevertheless","new","newer","newest","next","nice","night","nights","nights weekends","nine","ninety","nj","no","nobody","noise","non","none","nonetheless","noone","nor","normally","north","nos","not","NOTE","noted","notes","nothing","notice","notification","november","now","nowhere","ns t rat e","number","number one","number sequence","numbers","nurse rn","nv","ny","o","object","objections","objective","objectives","objects","observations","obstacles","obtain","obtained","obviously","occasion","october","of","off","offenders","offer","offerings","office","office environment","office procedures","offices","official","often","oh","ohio","ok","okay","oklahoma","old","older","oldest","omissions","omitted","on","once","one","one copy","one hour","one nineteen home health care","one time","one year","one year experience","one year probationary period","ones","online","only","onsite","onto","open","opened","opening","openings","opens","operation","operations","operations core competencies","opm form","opportunities","opportunity","opportunity employer","opportunity employer applicants","opportunity employer drug","opportunity employer eoe","opportunity employer m f","opportunity employer segment","opportunity employers","option","options","or","orange","ord","order","ordered","ordering","orders","org","organization","organization ability","organization eoe aa m f","organization skills","organizations","orientation","orientation ancestry","orientation gender identity","origin","origin age","origin age disability","origin disability","other","others","others ability","otherwise","ought","our","ours","ourselves","out","outcome","outcomes","output","outreach","outside","oven grill deef","over","overall","oversight","overtime","overview","overview benefits","owing","own","owner","ownership","p","p m","pace","packages","page","pages","pair","paper","parameters","parents","part","parted","participant","participants","participate","participation","particles","particular","particularly","parting","partner","partners","partnership","partnerships","parts","past","paste","path","patience","patient","patient care","patients","patterns","payment","payments","pdf","peers","pennsylvania","people","per","percent","percentages knowledge","performance","performance reviews","performance standards","perhaps","period","periods","perks","permission","person","personal","personality","personnel","persons","person's strengths","perspective","perspectives","ph","phase","phases","philadelphia","philosophy","phoenix","phone","phones","picture","pieces","pipeline","pittsburgh","place","placed","placement","places","plan","plans","plant","platform","platforms","please","plenty","plus","pm","point","pointed","pointing","points","policies","policies procedures","policy","pool","poorly","portion","portions","position","position applicants","position click","position comments","position description","position email","position end date level","position experience","position requirements","position responsibilities","position summary","position type","position works","positions","positions subject","posses","possession","possibilities","possibility","possible","possibly","post","post offer pre placement drug test","potentially","pounds","pounds ability","power","pp","practice","practices","practices ability","pre","pre employment","pre employment drug","pre employment substance abuse","pre employment tests","pre placement verification","predominantly","preference","preferences","preferred","premier","preparation","presence","present","presented","presenting","presents","pressure","preview questions","previously","pride","primarily","primary","principles","print","priorities","prioritization","prioritize","priority","privacy","prn","proactive","probably","problem","problems","problems ability","procedure manuals ability","procedures","procedures ability","process","process improvements","processes","product lines","production environments","productivity","products","professional","professionalism","professionals","proficiency","profile","profit","profit organization","program","program requirements","programs","progress","project","project status","project team members","projects","promise","promotion","promotions","promptly","proof","properties","prospects","proud","provider","provides","provision","provisions","pto","publications","punctual","punctuation","purpose","purposes","pursuit","put","puts","putting","q","qualification","qualification determinations","qualification requirements","qualifications","qualifications ability","qualifications determinations","qualifications education","qualifications experience","qualifications knowledge","qualifications one","qualifications requirements","qualify","qualities","quality","quality assurance","quality issues","quality results","quality service","quality services","quality solutions","quality standards","quality work","quantities","quantity","que","question","questionnaire","questionnaire responses","questionnaire view","questions","quickfind","quickly","quite","qv","r","r amp","r ce","r g","r l schedule","r sum","race color","race color religion","race color religion gender","race color religion sex","ran","range","ranges","rank dates","rapport","rate","rates","rather","rd","re","re t","readily","readiness","reality","really","reason","reasons","recent","recently","recognition","recommendation","recommendations","reconciliation","record","records","recovery","red","ref","reference","references","referrals","refs","regard","regarding","regardless","regards","region","regions","registration","regulations","reinstatement rights","related","relation","relations","relationship","relationships","relatively","release","reliability","religion","relocation","relocation assistance","relocation expenses","relocation package","removal","removal date","replacement","report","reports","representation","representative","reputation","request","requests","require","required","requirement","requirements","requirements ability","requisition id","requisition number","research","residence","residency","residents","resilience","resolution","resource","resources","resources department","respect","respectively","response","responses","responsibilities","responsibilities duties","responsibility","responsible","rest","restrictions","restroom","result","resulted","resulting","results","resume","retention","retention incentives","retirement plan","retirement separation","return","review","reviews","reviews dollar general's","reviews intermountain healthcare","reviews jpmorgan chase","revisions","reward","rewards","right","right candidate","right people","rights","rise","risk","rn","rn license","road","roadmap","role","role model","roles","roll","room","rooms","root cause","rotation","rounds","route","rules","run","s","safety","safety regulations","safety rules","said","saint","salaries","salary range","salary requirements","sales assoc ft","same","sames","sample","san","san francisco","satisfaction","saturday","saw","say","saying","says","scale","schedule","schedule type","schedules","school degree","school diploma","school graduate","school graduation","school level","scope","score","scratch","screen","screens","search","seattle","sec","second","secondary","seconds","section","sections","sector","secure","securities","security number","security policies","see","seeing","seem","seemed","seeming","seems","seen","sees","selection","selection priority","selection process","selection process applicants","selection process bp","self","self starter","selfstarter","selves","semi","sense","sensitivity","sent","sentences","september","sequence","series","serious","service","service career career","service i e","services","services firm","services multi specialty clini","services schedule","sessions","sets","settings","setup","seven","seven years","several","sf","shall","shape","share","she","shed","she'll","shes","shield","shift","shift day job employee status","shift details","shift work","shifts","short","should","shoulder","shouldn't","show","show proof","showed","showing","shown","showns","shows","si organization inc","side","sides","sign","signature","signatures","significant","significantly","silver spoon","similar","similarly","since","sincere","site","sites","situation","situations","six","six continents","six months","six years","sixty","size","skill","skill level","skill sets","skills","skills ability","skills attention","skills experience","skills knowledge","skills proficiency","slightly","small","smaller","smallest","smile","so","society","solution","solutions","some","somebody","somehow","someone","somethan","something","sometime","sometimes","somewhat","somewhere","sonoma county","soon","sorry","sound decisions","source","sources","space","spaces","specialization","specialties","specialty","specialty area","specifically","specifications","specified","specify","specifying","spectrum","spirit","sponsorship","springs","sr","st re n g","stability","staff","staff meetings","staff members","stage","stages","stakeholders","stand","standard","standardization","standards","start","state","statement","statements","states","station","status","status reports","step","steps","still","stipend","stock availability","stocker","stop","stories","strategies","street","strength","strengths","stress","strong","strongly","structure","structures","study","stuff","style","styles","sub","subject","subject matter","subject matter expertise","subject matter experts","submission","submissions","submit","subordinates","subsidiaries","subsidiary","substances","substantial","substantially","substitute","success","successfully","such","sufficiently","suggest","suggestions","suitability","suite","summary","summer","sunday","sup","supervision","supervision ability","supervisor","supervisors","supervisors management staff","supplies","support","supports","sure","surfaces","system","systems","systems experience","t","table","tables","take","taken","taking","talent","talented","talents","target","task","tasks","tasks ability","tasks responsibilities","tdd","team","team ability","team atmosphere","team environment","team environment ability","team member","team members","team player","team work","teams","teamwork","technique","techniques","techniques ability","technologies","technology","telephone","tell","ten","ten years","tends","term","term disability","term positions","term relationships","terminal","termination","terminology","terms","territories","territory","test","test plans","texas","th","than","thank","thanks","thanx","that","that'll","thats","that's","that've","the","their","theirs","them","themselves","then","thence","theory","there","thereafter","thereby","thered","therefore","therein","there'll","thereof","therere","theres","thereto","thereupon","there've","these","they","theyd","they'll","theyre","they've","thickv","thin","thing","things","think","thinker","thinks","third","this","those","thou","though","thoughh","thought","thoughts","thousand","thousands","three","three core competencies","three core values integrity first service","three months","three references","three years","three years experience","throug","through","throughout","thru","thursday","thursday june","thus","til","till","time","time ability","time basis","time constraints","time employees","time experience","time frame","time job","time job type","time management","time part time","time position","time term","time travel","timeframes","timelines","timeliness","times","timestamp","tip","title","titles","tn","to","today","todays","together","tons","too","took","tool","tools","top","topics","totes stock merchandise","touch","toward","towards","track record","tradition","trainings","transactions","transcript","transcripts","transfer","transfers","transformation","transition","transport","travel","travel arrangements","travel percentage none relocation","treatment","tried","tries","trillion","trouble","truly","trust","try","trying","ts","tuesday","tuition reimbursement","turn","turned","turning","turns","twelve","twenty","twice","twist","two","two weeks","two years","two years experience","tx","type","types","u","un","under","unfortunately","unit","units","university","unless","unlike","unlikely","until","unto","up","updates","upload","upon","ups","urgency","us","usa","usage","usajobs account","use","use cases","use hands","used","useful","usefully","usefulness","user","users","uses","using","usually","utilities","utilization","v","v drug","v intermountain healthcare","v kpmg","va","vacancies","vacancy","vacancy announcement","vacancy id","vacation","vacation time","vacations","valid","validation","validity","valley","value","values","variables","variances","variety","various","vc","'ve","vegas","vendors","verification","verifies","version","very","veteran status","veteran status jobserve usa","veterans' preference","via","view","vigilance","violations","virginia","visa status","visibility","vision","vision abilities","vision benefits","vision coverage","vision depth perception","vision distance vision color vision","vision insurance","vision life","vision life insurance","vision orbits","visit","visits","viz","vol","vols","volume","volunteers","vp","vs","vta","w","wa","wage","wages","want","wanted","wanting","wants","was","washington","washington state department","wasn't","waste","water","waterworks requisition","way","ways","we","weather","web site","wed","week","weekend","weekend hours","weekend work","weekends","weeks","weight","weights","welcome","well","we'll","wells","went","were","we're","weren't","werks","west","we've","what","whatever","what'll","whats","what's","when","whence","whenever","where","whereafter","whereas","whereby","wherein","wheres","whereupon","wherever","whether","which","while","whim","white","whither","who","whod","whoever","whole","who'll","whom","whomever","whos","whose","why","wi","widely","will","willing","willingness","wisconsin","wish","with","within","without","won't","word","words","work","work activities","work area","work areas","work assignment","work assignments","work authorization","work both","work day","work environment","work environments","work ethic","work experience","work experience section","work force","work habits","work history","work hours","work life balance","work mosaic","work orders","work overtime","work place","work practices","work schedule","work schedules","work stations","work tasks","work weekends","workday","worked","worker","workers","workflow","workforce","working","workload","workplace","works","world","world class","world leader","world's","would","wouldn't","wv","www","www stvhs com careers asp careers","x","y","year","year college degree","year degree","year experience","year history today parent kpmg","years","years experience","years' experience","years hands","years sales experience","years work experience","yellow","yes","yet","york","york city","you","youd","you'll","young","younger","youngest","your","youre","you're","yours","yourself","yourselves","you've","yr","yrs","yrs experience","z","zero"];
    	var stop_tags = ["this","each", "search", "email", "text", "save", 0,"to.","specific","partial","light","stay","max","rows","break","pass","shared","generic","send","takes","send","account", "blank","match", "main", "launch","default","label", "fan", "lifted", "free", "updating", "update", "external","width", "files", "var", "remove","store","single","set", "add", "performance", "import", "share", "get", "select", "limit", "replace", "list", "exit", "file", "make", "error", "run", "user", "class", "clear", "function", "code", "build", "click", "final", "move", "size", "process", "action", "image", "view", "folder", "object", "date", "point"];
    	var stop_combined = stop_words.concat(stop_tags);
    		if(stop_combined.indexOf(the_word) === -1) return false;
    		else return true;

    } //"I","But", "Any", "Is", "Here", "don", "It", "Are", "Even"

/*    function tagstop(the_tag){
    	stop_tags = ["this","each", "search", "email", "text", "save","remove", "" "set", "add", "performance", "import", "share", "get", "select", "limit", "replace", "list", "exit", "file", "make", "error", "run", "user", "class", "clear", "function", "code", "build", "click", "final", "move", "size", "process", "action", "image", "view", "folder", "object", "date", "point"];
    	if(stop_tags.indexOf(the_tag) === -1) return true;
    	else return false;
    }  */

}();

if ( argv.trainlist ) { Mongo_loader.trainlist(); }
else if ( argv.vectorgen ) { Mongo_loader.vectorgen(); }
else if ( argv.crunch ) { Mongo_loader.crunch(); }
else if ( argv.toptags ) { Mongo_loader.toptags(); }
else if ( argv.dictionarylist ) { Mongo_loader.dictionarylist(); }
else if ( argv.dictionarypurge ) { Mongo_loader.dictionarypurge(); }
else if ( argv.natural ) { Mongo_loader.natural(); }
else if ( argv.vectorlist ) { Mongo_loader.vectorlist(); }
else if ( argv.vectortest ) { Mongo_loader.vectortest(); }
else if ( argv.vectorpurge ) { Mongo_loader.vectorpurge(); }
else if ( argv.hardpurge ) { Mongo_loader.hardpurge(); }
else if ( argv.help ) { Mongo_loader.help(); }
else { Mongo_loader.help(); }

