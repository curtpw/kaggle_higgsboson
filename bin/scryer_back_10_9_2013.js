#!/usr/bin/env node

//"use strict";

/*
*** scryer --- command-line RSS scraper and latent semantic index generator  *** Developer: Curt White
*/

var sibyl = require('./sibyl.js');
var rss_urls = require('./rss_urls4');
var simhash = require('simhash')('md5');

var argv = require('optimist').argv;
var request = require('request');
var colors = require('colors');
var fancyTimeStamp = require('fancy-timestamp');
var FeedParser = require('feedparser');
var Db = require('mongodb').Db,
    Server = require('mongodb').Server;

var db = new Db('ScryerDB', new Server('localhost', 27017), { w: 1 });
var collection = db.collection('data', { w: 1 });
var thesaurus = db.collection('thesaurus', { w: 1 });
var treference = db.collection('treference', { w: 1 });

collection.ensureIndex( { "hash": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping
treference.ensureIndex( { "hash": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping
thesaurus.ensureIndex( { "theword": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping


Object.size = function(obj) {         //function for getting size of object arrays    -- syntax for use: var x =  Object.size(myArray);
    var size = 0, key;				  
    for (key in obj) {
        if (obj.hasOwnProperty(key)) size++;
    }
    return size;
};

var Scryer = function() {

	
	function lookup() {
		
		var term1 = process.argv[3],
            term2 = process.argv[4];			

        db.open(function(err, db) {

            if (err) { console.dir(err); }
			//***LOOKUP TERM1
            thesaurus.find({theword : {$in: [term1, term2]}}).toArray(function(err, first_item) {
			
                if (err || term1 == false || term2 == false) { console.dir(err); }

                if (first_item[0] == null || first_item[0] == undefined || first_item[0].length === 0 || first_item[1] == null || first_item[1] == undefined || first_item[1].length === 0) {
				
					console.log(term1 + ' or ' + term2 + ' not found'); 
					term1 = false;
					db.close();
					
				} else {

					console.log(term1 + ' and ' + term2 + ' found in index');	
																						
									//GET SEMANTIC RELATIONSHIP
									//default value for score is 0	
																														
											var numdocs1 = first_item[0].docs.length;
											var numdocs2 = first_item[1].docs.length;
											
											var unique_docs = unique(first_item[0].docs.concat(first_item[1].docs));
											var matches = (numdocs1 + numdocs2) - unique_docs;							
											
											var score = 0;
											
											if(numdocs1 >= numdocs2) score = matches / numdocs2;
											else score = matches / numdocs1;
											
											console.log(first_item[0].theword + ' is in ' + numdocs1 + ' documents');
											console.log(first_item[1].theword + ' is in ' + numdocs2 + ' documents');
										//	console.log('comparisons: ' + counter);
											console.log('TERM MATCHES: ' + matches);
											console.log('SCORE: ' + score);											
																					
											
											db.close();		
											
							//end treference lookups													
					
				}
				               
            });  //end lookup term1
			
		//	db.close();												
		});			 
    } 	
	
	function unique(arr) {  //find number of unique terms! er, I mean get matches!
		var hash = {}, result = [], total = 0;
		for ( var i = 0, l = arr.length; i < l; ++i ) {
			if ( !hash.hasOwnProperty(arr[i]) ) { //it works with objects! in FF, at least
				hash[ arr[i] ] = true;
				//result.push(arr[i]);
				total++;
			}
		}
		//return result;
		return total;
	}
	
	function spool() {

        db.open(function(err, db) {
		
			//GET URLS
			var fs = require("fs");
			var urls = fs.readFileSync("rss_urls4.js", "utf8");     //read files from external list (rss_urls.js)
			urls = JSON.parse(urls);			
			
			//GET COUNTER AND UPDATE COUNTER
			var counter = 6;
			var nextcount = 0;
			var maxruns = 1000;
			var runcount = 0;
			var sendurls;
		
			//**FIND SPOOL PLACE***DEAL WITH COUNTER TO DETERMINE WHICH URL
			treference.ensureIndex( { "hash": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping
						
			//***ENTER SPOOL***
			Id = setInterval(function() {
			
				console.log("Runs:" + runcount); runcount++;

 
					treference.find({"spool": "t"}).toArray(function(err, items) {	
						
						if (err) { console.dir(err); console.log('*** ERROR IN SPOOL ***'); }
						
					
						
							treference.remove( items[0], function(err, doc) {
								
								if(items[0] == undefined || items[0].counter == undefined || items[0].counter == null) counter = 0;
								else counter = items[0].counter;
								
								console.log('COUNTER: ' + counter);
								
								if(counter > urls.length){ counter = 0; nextcount = 0; 
								} else { nextcount = counter + 1; }   //$$$*** SPOOL BATCH SET TO 1
								
												
								treference.insert([{ spool : 't', "counter" : nextcount, hash : "empty"}], function (err, document){
								//	console.log('ATTEMPTING INSERT'); 
								//	db.close(); 
								
									//*** CALL TREADGEN *** CALL TREADGEN *** CALL TREADGEN *** CALL TREADGEN
									
									sendurls = urls.slice(counter, (counter + 1));     //$$$*** SPOOL BATCH SET TO 1
									
									treadgen(sendurls);   //CALL SCRAPER AND THESAURUS GENERATION FUNCTION
									
									//*** END TREADGEN *** END TREADGEN *** END TREADGEN *** END TREADGEN
										

									//*** END SPOOL
									if(runcount >= maxruns){
										clearInterval(Id); setTimeout(function() { db.close(); }, 15000);
									}
		
								});
							});
							
					});  //end find in spool
			

			}, 10000)
			 
		}); //end opendb

	}	
	
	function treadgen(feeds) {
	
		feeds.forEach (function(feed) {
		
			setTimeout(function() {  //**TIMEOUT**
			
				var the_url =  feeds[0];
					treference.ensureIndex( { "hash": 1 }, { unique: true, dropDups: true }, function(err) {}  );     //make field unique for auto deduping
					thesaurus.ensureIndex( { "theword": 1 }, { unique: true, dropDups: true }, function(err) {}  ); 
					//	if (err) { console.dir(err); }

						var entries=[];
						var a_counter = 0;
						//***SCRAPE RSS***
						request(the_url).pipe(new FeedParser())   // EXTERNAL RSS URL						
					
							.on('error', function(error) {	console.log('!'); })
							
							.on('end', function(item) {
																
											function async(arg, callback) {   //store scraped data in treference collection
						
												treference.insert({ "hash" : arg.hash, "time" : arg.time, "terms" : arg.terms},	{safe: true, continueOnError: true}, function (err, document){ 	   setTimeout(function() { }, 600);   });
											
												//  console.log('do something with \''+arg+'\', return 1 sec later');
												setTimeout(function() {  callback(arg * 2);  }, 1000); 
											}
											
											function final() { 
												//****BEGIN THESAURUS GENERATION****
												//****BEGIN THESAURUS GENERATION****
																			
												console.log('BEGIN THESAURUS GENERATION'); 												
												var termcount = 0;				
														setTimeout(function() {   //**TIMEOUT**
																	
																			entries.forEach(function(entry) {					
																				console.log('- - - - - - PROCESSING TREFERENCE ENTRY - - - - - - -');
																				
																				thesaurus.ensureIndex( { "theword": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping
																																						
																					entry.terms.forEach(function(ref_term) {
																					termcount++;
																						
																						setTimeout(function() { 
																						
																							var temphash = [];
																							temphash = entry.hash;
																							
																							var tempscore = [];
																							tempscore = ref_term.score;

																							var tempword = ref_term.word;
																							
																							//ONE
																							if(ref_term.score > 40){    //SCORE CUTTOFF FOR ENTRY OF TERMS INTO THESAURUS INDEX
																								
																								thesaurus.update(															
																									{ theword: tempword },
																									{	
																										$addToSet: {thescore: tempscore},
																										$addToSet: {docs: temphash} 
																									},
																									{upsert: true},
																									
																									function (err, document){ 
																									//	console.log('Updated to thesaurus:' + tempword); 
																										console.log('JOB LISTINGS SCRAPED: ' + entries.length);
																										console.log('TERMS PROCESSED: ' + termcount);
																									//	setTimeout(function() { /*db.close();*/ }, 100);
																								});  																				
																							}
																							
																							//TWO
																							if(ref_term.score > 30 && ref_term.score <= 40){    //SCORE CUTTOFF FOR ENTRY OF TERMS INTO THESAURUS INDEX
																								
																								thesaurus.update(															
																									{ theword: tempword },
																									{	
																										$addToSet: {thescore: tempscore},
																										$addToSet: {docs: temphash} 
																									},
																									{upsert: true},
																									
																									function (err, document){ 
																									//	console.log('Updated to thesaurus:' + tempword);
																										console.log('JOB LISTINGS SCRAPED: ' + entries.length);
																										console.log('TERMS PROCESSED: ' + termcount);	
																									//	setTimeout(function() { /*db.close();*/}, 100);
																								});  																				
																							}
																							
																							//THREE
																							if(ref_term.score > 20 && ref_term.score <= 30){    //SCORE CUTTOFF FOR ENTRY OF TERMS INTO THESAURUS INDEX
																								
																								thesaurus.update(															
																									{ theword: tempword },
																									{	
																										$addToSet: {thescore: tempscore},
																										$addToSet: {docs: temphash} 
																									},
																									{upsert: true},
																									
																									function (err, document){ 
																										//console.log('Updated to thesaurus:' + tempword); 
																										console.log('JOB LISTINGS SCRAPED: ' + entries.length);
																										console.log('TERMS PROCESSED: ' + termcount);
																									//	setTimeout(function() { /*db.close();*/ }, 100);
																								});  									
																							}
																						
																						}, 300);
																					
																					});
																		
																		//	});																		
																	//	}, 1000);																	
																//	}																				
						
															});
															
													}, 500);		
													
												//****END THESAURUS GENERATION****
											}

											//var items = [ 1, 2, 3, 4, 5, 6 ];
											var items = entries;
											var results = [];

											items.forEach(function(item) {
											  async(item, function(result){
												results.push(result);
												if(results.length == items.length) {
												  final();
												}
											  })
											});
														
								//setTimeout(function() { db.close();	 }, 1000);
											
								console.log('THE END'); 
							
							})
							.on('data', function(item) {
							
								if(item.description != null && item.description != undefined && item.description.length > 300 ) {    //filter bad and short listings
								
									item.description = item.description.replace(/\s{2,}/g, " ");  			     //space strip regex    
									item.description = item.description.replace(/(<([^>]+)>)/ig, "");  		     //html strip regex 
									item.terms = sibyl.extract(item.description);							     //get terms and term values using Sibyl
									item.time = fancyTimeStamp(item.pubdate, true);
									
									//***SPECIAL HASH FORMULA
									var title_hash = simhash(item.title);		//***1) 128 bit binary hash of title and description	
									var description_hash = simhash(item.description.slice(0,50));   //just use first 50 characters
									
									title_hash = title_hash.join('');	//convert comma separated hash into string	
									description_hash = description_hash.join('');
									
									title_hash = parseInt(title_hash, 2 || 10).toString(16 || 10); //convert to hex  
									description_hash = parseInt(description_hash, 2 || 10).toString(16 || 10);
									
									//if(title_hash.length === 31) title_hash.concat('0');
									//else if(title_hash.length === 32) title_hash.concat('00');
									
									//if(description_hash.length === 31) description_hash.concat('0');
									//else if(description_hash.length === 32) description_hash.concat('00');
									
									if(title_hash.length === 32 && description_hash.length === 32){
										console.log(item.title.bold);
										console.log( title_hash + '  '  + description_hash);
										console.log( title_hash.length + '  '  + description_hash.length);
										var title_buf = new Buffer(title_hash, 'hex');     
										var description_buf = new Buffer(description_hash, 'hex');
										
										title_hash = title_buf.toString('base64');		//convert hex to base64
										description_hash = description_buf.toString('base64');		//convert hex to base64
										
										item.hash = title_hash.slice(0,9).concat(description_hash.slice(0,9));             //remove digits from hash to economize
										//item.hash = item.hash.concatMath.random().toString(36).substring(7).slice(0,1);
									
									} else {
										item.hash = title_hash.slice(0,18); 
										console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'); 
										console.log('@@@@@@@@@@@@@@@@@@@@@@@@@@@@@'); 
									}
																						
									console.log('- - - - - - - - - - - - - - - -');
									console.log(item.title.bold);											 
									console.log(item.hash); 																
								//	console.log(item.terms);												 
									console.log(item.time.grey);		
										
									
									a_counter++;									
																
									entries.push({
										"hash" : item.hash,
										"time" : item.time,
										"terms" : item.terms
										});								 																		
										
								console.log('Listings processed: ' + a_counter);
							
								 }						 
							
							});
							
							console.log(entries);
							
					 }, 5000); 
							
				});
				//	db.close();

			}	
			


     function tscore() {

		var cuttoff = 25; 									//*** drop any terms after this number
		
		var resume_terms = [];
			
		resume_terms = require('./resume_terms.js');    //load resume terms in var resume_terms  (required, same format as collection term objects)
		resume_terms = resume_terms.resume_terms;
		
		var out = [];   //slice to cuttoff
		for (var i = 0; i < cuttoff; i++){ if(resume_terms[i] != undefined) out.push(resume_terms[i]); }
		resume_terms = out;
	 
        db.open(function(err, db) {
			//collection.ensureIndex( { "terms": 1 } );     //this index job listing terms
            if (err) { console.dir(err); }

			var counter = resume_terms.length;  //if we've processed all the terms
			
			resume_terms.forEach(function(term) {	//CYCLE THROUGH RESUME TERMS	 
			
				console.log('TEST: ' + term.word);
			
				thesaurus.find({theword : term.word}).toArray(function(err, entry) {  //see if one of the resume terms is in the T
										
					if (err || entry[0] == undefined || entry[0] == null) {   //if not found in thesaurus
										
						console.dir(err); 
						console.log(term.word + ' NOT FOUND IN THESAURUS'); 
						
						var index = resume_terms.indexOf(term);
						
						if(index > -1){ 
							resume_terms.splice(index,1); 				
							counter--;		
						}    //remove term if not found in thesaurus						
					}
					
					else {
						term.entry = entry[0]; 
						term.score = 0;
						counter--; 
						console.log(term.word + ' FOUND'); //load thesaurus entry into term object if/when found
					}  
															
					if(counter === 0){     //wait till T filtering is over
						
						var temp_resume_terms = resume_terms;    //delete as we go to reduce duplicate array element comparisons
						var search_for_doc_num = 0;
						var search_against_doc_num = 0;
						var high_doc_num = 0;
						var search_for_score = 0;
						var search_against_score = 0;
						var unique_num = 0;
						
						for(var t = 0; t < resume_terms.length; t++){    //CYCLE THROUGH RESUME TERMS IN ORDER
						
							if(resume_terms[t].entry != undefined && resume_terms[t].entry != null){
						
								console.log('TEST2: ' + resume_terms[t].word); 
								
								var counter2 = 0;	
								
								temp_resume_terms.forEach(function(tempterm) {	//CYCLE THROUGH EXISTING TEMP RESUME TERMS	 (should be none by end)
									
									if(resume_terms[t].word != tempterm.word){
									
										unique_num = unique(resume_terms[t].entry.docs.concat(tempterm.entry.docs));      //filter doc hashes in term objects
																															
										search_for_doc_num = resume_terms[t].entry.docs.length;
										search_against_doc_num = tempterm.entry.docs.length;
										
										if(search_for_doc_num >= search_against_doc_num) high_doc_num = search_for_doc_num;   
										else high_doc_num = search_against_doc_num;
										
										search_for_score = ( (search_for_doc_num + search_against_doc_num - unique_num) / 2 ) / search_for_doc_num;
										search_against_score = ( (search_for_doc_num + search_against_doc_num - unique_num) / 2 ) / search_against_doc_num;
										
										console.log('SCORE FOR: ' + search_for_score);
										console.log('SCORE AGAINST: ' + search_against_score);
										
										resume_terms[t].score = resume_terms[t].score + search_for_score;     //add local score to total score for term
										//tempterm.score = tempterm.score + search_against_score;
										
										counter2++;																										
									}
									else counter2++;
																
								});																				
							}
						}					
					}
					
					
					if(counter2 === resume_terms.length){			// sort final results and display		
						
						resume_terms.sort(function(a, b)
						{
							return	parseFloat(b.score) - parseFloat(a.score);
									
						});		
																	
							for(var u = 0; u < resume_terms.length; u++){
												
								console.log('TEST5: ' + resume_terms[u].word); 
								console.log('  ' + resume_terms[u].score); 
								
								if(u === resume_terms.length - 1)	db.close();								
								
							}									
					}												
				});            
			});	
		});
	}			


 function tcompare() {

		var term_cut_off = 25; 									//*** max terms per doc	
		var score_cut_off = 25;
			
		var doc1 = [];
		var doc2 = [];
		
		var samples = require('./samples.js');    //load resume terms in var resume_terms  (required, same format as collection term objects)
		
		console.log('FIRST DOC TERMS  ' + samples.c[1].word  + samples.c.length);
		for(var i = 0; i < samples.c.length; i++){
			if(samples.c[i].word != undefined && doc1.length < term_cut_off && samples.c[i].score > score_cut_off){
				doc1.push(samples.c[i]);
				console.log(samples.c[i].word + '  ' + samples.c
				[i].score);
			}
		}
		
		console.log('');
		console.log('SECOND DOC TERMS');
		for(var j = 0; j < samples.e.length; j++){
			if(samples.e[j].word != undefined && doc2.length < term_cut_off && samples.e[j].score > score_cut_off){
				doc2.push(samples.e[j]);
				console.log(samples.e[j].word + '  ' + samples.e[j].score);
			}
		}
		
	 
        db.open(function(err, db) {
			//collection.ensureIndex( { "terms": 1 } );     //this index job listing terms
            if (err) { console.dir(err); }

			var counter1 = doc1.length;  //if we've processed all the terms
			var counter2 = doc2.length;  //if we've processed all the terms
			var counter3 = 0;
			
			doc1.forEach(function(doc1term) {	//CYCLE THROUGH RESUME TERMS	 
			
				console.log('TEST: ' + doc1term.word);
			
				thesaurus.find({theword : doc1term.word}).toArray(function(err, entry) {  //see if one of the doc1 terms is in the T
										
					if (err || entry[0] == undefined || entry[0] == null) {   //if doc1 term not found in thesaurus
										
						console.dir(err); 
						console.log(doc1term.word + ' NOT FOUND IN THESAURUS'); 
						
						var index = doc1.indexOf(doc1term);
						
						if(index > -1){ 
							doc1.splice(index,1); 				
							counter1--;		
						}    //remove term from document 1 if not found in thesaurus						
					}					
					else {
						doc1term.entry = entry[0]; //attach thesaurus data to document term
						doc1term.score = 0;
						counter1--; 
						console.log(doc1term.word + ' FOUND'); //load thesaurus entry into term object if/when found
					}  
															
					if(counter1 === 0){     //wait till T filtering is over
					
					//MOVE TO SECOND DOC ---- MOVE TO SECOND DOC  ---- MOVE TO SECOND DOC
						
								doc2.forEach(function(doc2term) {	//CYCLE THROUGH DOC2 TERMS	 
								
									console.log('TEST: ' + doc2term.word);
								
									thesaurus.find({theword : doc2term.word}).toArray(function(err, entry) {  //see if one of the doc1 terms is in the T
															
										if (err || entry[0] == undefined || entry[0] == null) {   //if doc1 term not found in thesaurus
															
											console.dir(err); 
											console.log(doc2term.word + ' NOT FOUND IN THESAURUS'); 
											
											var index = doc2.indexOf(doc2term);
											
											if(index > -1){ 
												doc2.splice(index,1); 				
												counter2--;		
											}    //remove term from document 1 if not found in thesaurus						
										}					
										else {
											doc2term.entry = entry[0]; //attach thesaurus data to document term
											doc2term.score = 0;
											counter2--; 
											console.log(doc2term.word + ' FOUND'); //load thesaurus entry into term object if/when found
										}  
																				
										if(counter2 === 0){     //wait till T filtering is over    *****THESAURUS FILTERING COMPLETE*****
							
											var temp_doc_terms1 = doc1;    //delete as we go to reduce duplicate array element comparisons										
											var search_for_doc_num = 0;
											var search_against_doc_num = 0;
											var high_doc_num = 0;
											var search_for_score = 0;
											var search_against_score = 0;
											var unique_num = 0;
											
											
											for(var t = 0; t < doc1.length; t++){    //CYCLE THROUGH DOC1 TERMS IN ORDER
											
												if(doc1[t].entry != undefined && doc1[t].entry != null){
											
													console.log('TEST3: ' + doc1[t].word); 
													
													var counter3 = 0;	
													
													doc2.forEach(function(doc2term) {	//CYCLE THROUGH EXISTING DOC2 TERMS	 (should be none by end)
														
														if(doc1[t].word != doc2term.word){
														
															unique_num = unique(doc1[t].entry.docs.concat(doc2term.entry.docs));      //filter doc hashes in term objects
																																				
															search_for_doc_num = doc1[t].entry.docs.length;
															search_against_doc_num = doc2term.entry.docs.length;
															
															if(search_for_doc_num >= search_against_doc_num) high_doc_num = search_for_doc_num;   
															else high_doc_num = search_against_doc_num;
															
															search_for_score = ( (search_for_doc_num + search_against_doc_num - unique_num) / 2 ) / search_for_doc_num;
															search_against_score = ( (search_for_doc_num + search_against_doc_num - unique_num) / 2 ) / search_against_doc_num;
															
															console.log('SCORE FOR: ' + search_for_score);
															console.log('SCORE AGAINST: ' + search_against_score);
															
															doc1[t].score = doc1[t].score + search_for_score;     //add local score to total score for term
															doc2term.score = doc2term.score + search_against_score;     //add local score to total score for term
															//doc2term.score = doc2term.score + search_against_score;
															
															counter3++;																										
														}
														else counter3++;
														

														//**********awesomeFINAL DISPLAY
														if(counter3 === doc2.length){			// sort final results and display		
						
															var doc1score = 0;
															var doc2score = 0;
						
															doc1.sort(function(a, b)
															{
																return	parseFloat(b.score) - parseFloat(a.score);																	
															});		
															
															doc2.sort(function(a, b)
															{
																return	parseFloat(b.score) - parseFloat(a.score);																		
															});	
																
															console.log('------------------------------------');
															console.log('DOCUMENT 1 SCORES: ');	
															for(var u = 0; u < doc1.length; u++){
																					
																console.log(doc1[u].word + '  ---  ' + doc1[u].score); 
																
																doc1score = doc1score + doc1[u].score;
																
																if(u === doc1.length - 1)	db.close();																
															}	
															
															console.log('------------------------------------');
															console.log('DOCUMENT 2 SCORES: ');	
															for(var w = 0; w < doc2.length; w++){
																					
																console.log(doc2[w].word + '  ---  ' + doc2[w].score); 
																	
																doc2score = doc2score + doc2[w].score;	
																	
																if(w === doc2.length - 1)	db.close();															
															}
															
															console.log('------------------------------------');
															console.log('Document 1 TO Document 2: ' + doc1score);
															console.log('Document 2 TO Document 1: ' + doc2score);
															
														}	
														
													});																				
												}
											}				
										}  // LAST THESAURUS FILTERING BRACKET
									});            
								});								
							}   														
				});            
			});	
		}); 
	}								
	
			

     function data() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

            console.log('Job Listings in DB'.yellow.bold);

            collection.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

                if (items.length === 0) { console.log('Empty here :('); }

                for (var i = 0; i < items.length; i++) {
					console.log('- - - - - - NEW LISTING DOCUMENT - - - - - - -');
                    console.log(items[i]);
                }
				
				console.log('Number of listings in collection: ' + items.length);
				
                db.close();

            });

        });

    } 	
	
	 function tdata() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

            console.log('Your treference data'.yellow.bold);

            treference.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

                if (items.length === 0) { console.log('Empty here :('); }

            /*    for (var i = 0; i < items.length; i++) {
					console.log('- - - - - - NEW ENTRY - - - - - - -');
                    console.log(items[i]);
                }   */

				console.log('Number of entries in treference collection: ' + items.length);
				
             db.close();  
			 
            });
			 	
        });

    } 	
	
	function trdata() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

			var singles_count = 0;
			
            console.log('Your thesaurus data'.yellow.bold);

            thesaurus.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

                if (items.length === 0) { console.log('Empty here :('); }

                for (var i = 0; i < items.length; i++) {
				//	console.log('- - - - - - NEW ENTRY - - - - - - -');
                //    console.log(items[i].theword);
				//	console.log('Num docs: ' + items[i].docs.length);
					if(items[i].docs.length === 1) singles_count++;
                }   

				console.log('Number of entries in thesaurus index: ' + items.length);
				console.log('Number of singles in thesaurus index: ' + singles_count);
				
                db.close();

            });

        });

    } 	
	
	
	
	function stopwords() {
	
		fs = require('fs');
		
		var cutoff = process.argv[3];

        db.open(function(err, db) {

            if (err) { console.dir(err); }

            console.log('Finding Stopword Candidates With Frequency > ' + cutoff + '....'.yellow.bold);

            thesaurus.find().toArray(function(err, items) {
			
			 items.sort(function(a, b){
					 var nameA=a.theword.toLowerCase(), nameB=b.theword.toLowerCase()
					 if (nameA < nameB) //sort string ascending
					  return -1 
					 if (nameA > nameB)
					  return 1
					 return 0 //default return value (no sorting)
			})

                if (err) { console.dir(err); }

                if (items.length === 0) { console.log('Empty here :('); }
				var counter = 0;
				var theterms = [];
               
				for (var i = 0; i < items.length; i++) {
				
					if(items[i].docs.length > cutoff){
						console.log(items[i].theword);
						theterms.push(items[i].theword);
						counter++;
																						
					}
                }   
				
				fs.writeFile('stopword-candidates.txt', theterms, function (err) {
						if (err) return console.log(err);
				});
						
				console.log('Number of terms with frequency > ' + cutoff + ': ' + counter);
				
                db.close();

            });

        });

    } 
	
	
	
	function listingsamp() {
	
		fs = require('fs');
		
        db.open(function(err, db) {

            if (err) { console.dir(err); }      

            collection.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

                if (items.length === 0) { console.log('Empty here :('); }

				var output = items.slice(1,5).concat (items.slice(60,65) , items.slice(110,115) );
				output = JSON.stringify(output);
				fs.writeFile('listing-samples.txt', output, function (err) {
						if (err) return console.log(err);
				});
						
				console.log('Listing samples written to text file');
				
                db.close();

            });

        });

    } 
	

	
	function lookupdir() {
		
		var term1 = process.argv[3],
            term2 = process.argv[4];			

        db.open(function(err, db) {

            if (err) { console.dir(err); }

			//***LOOKUP TERM1
            thesaurus.find({theword : term1}).toArray(function(err, first_item) {
			
                if (err) { console.dir(err); }

                if (first_item[0] == null || first_item[0] == undefined || first_item[0].length === 0) {
				
					console.log(term1 + ' not found'); 
					term1 = false;
					db.close();
					
				} else {

					console.log(term1 + ' found in index');	
												
						
							//***LOOKUP TERM2
							thesaurus.find({theword : term2}).toArray(function(err, second_item) {
							
							//	console.log('THE SECOND ITEM: ' + second_item[0].theword);
								
								if (err) { 
									console.dir(err); 
									db.close();

								} if (second_item[0] == null || second_item[0] == undefined || second_item[0].length === 0) {
								
									console.log(term2 + ' not found'); 
									term2 = false;
									db.close();
									
								} else {

									console.log(term2 + ' found in index');	
																										
									//GET SEMANTIC RELATIONSHIP
									if(term1 != false && term2 != false && second_item[0].docs != undefined){    			//default value for score is 0	
																														
										function async(arg1, arg2, callback) {
										
											if(arg1 == arg2) matches++;  //compare term1 doc hash to term2 doc hash
											counter++;
											callback(arg1 * 2);																									
										}
																													
										
										function final() {
											var numdocs1 = first_item[0].docs.length;
											var numdocs2 = second_item[0].docs.length;
											
											var score1 =  matches / numdocs1;
											var score2 =  matches / numdocs2;
											var scoreav;
											
											if(numdocs1 >= numdocs2) scoreav = matches / numdocs2;  //av score is just stronger score - not true average
											else scoreav = matches / numdocs1;
											
											if((numdocs1 / numdocs2) >= 10 || (numdocs2 / numdocs1) >= 10 ) scoreav = scoreav * 0.9;  //penalty for lopsided frequency
											if((numdocs1 / numdocs2) >= 50 || (numdocs2 / numdocs1) >= 50 ) scoreav = scoreav * 0.8;  //penalty for lopsided frequency
											
											console.log(first_item[0].theword + ' is in ' + numdocs1 + ' documents');
											console.log(second_item[0].theword + ' is in ' + numdocs2 + ' documents');
											console.log('comparisons: ' + counter);
											console.log('TERM MATCHES: ' + matches);
											console.log('SCORES: ');
											console.log(first_item[0].theword + ' TO ' + second_item[0].theword + ' : ' + score1);
											console.log(second_item[0].theword + ' TO ' + first_item[0].theword + ' : ' + score2);
											console.log('SCORE: ' + scoreav);
											
											db.close();
										}

										//var items = [ 1, 2, 3, 4, 5, 6 ];
										var items1 = first_item[0].docs;
										var items2 = second_item[0].docs;
										var results = [];
										var matches = 0;
										var counter = 0;

										items1.forEach(function(item1) {
											items2.forEach(function(item2) {
												  async(item1, item2, function(result){
													results.push(result);
													if(results.length === (items1.length * items2.length)) {
													  final();
													}
												  })
											});
										});
										
									//	db.close();
										
									} else { console.log('ERROR!'); db.close(); } 
									//end treference lookups				
									
								}				        						
							}); //end lookup term2	  
					
				}
				               
            });  //end lookup term1
			
		//	db.close();												
		});			 
    } 	



	function purge() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

            collection.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

				items.forEach(function(item) {
				
					    collection.remove( item, function(err, doc) {});
				                						
				});
               
                console.log("ALL DATA REMOVED FROM JOB LISTING COLLECTION");
            //db.close();

            });

        });

    } 	
	
	
	function tpurge() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

            treference.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

				items.forEach(function(item) {
				
					    treference.remove( item, function(err, doc) {});
				                						
				});
               
                console.log("ALL DATA REMOVED FROM TREFERENCE COLLECTION");
             db.close();

            });

        });

    } 	
	
	function trpurge() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

            thesaurus.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

				items.forEach(function(item) {
				
					    thesaurus.remove( item, function(err, doc) {});
				                						
				});
               
				console.log('ALL DATA REMOVED FROM THESAURUS COLLECTION');
                db.close();

            });

        });

    } 	
	
	function tprune() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }		

            thesaurus.find().toArray(function(err, items) {

                if (err) { console.dir(err); }

				items.forEach(function(item) {
				
					if(item.docs.length === 1){
								   
					//	console.log('Removed from thesaurus: ' + item.theword);
						 thesaurus.remove( item, function(err, doc) {});
						
					}
				                						
				});
               
				console.log('ALL DATA ARE BELONG TO US');
				setTimeout(function() {     db.close();  }, 15000);

            });

        });

    } 	
	
	
	function tdedupe() {   //NO DUPLICATES SO NO REALL POINT, BUT USEFUL SORTING CAPABILITY

        db.open(function(err, db) {
		
			thesaurus.ensureIndex( { "theword": 1 }, { unique: true, dropDups: true }, function(err) {}  ); 			
            if (err) { console.dir(err); }		
			
            thesaurus.find().toArray(function(err, items){   //load thesaurus into array
				if (err) { console.dir(err); }
            
			    items.sort(function(a, b){
					 var nameA=a.theword.toLowerCase(), nameB=b.theword.toLowerCase()
					 if (nameA < nameB) //sort string ascending
					  return -1 
					 if (nameA > nameB)
					  return 1
					 return 0 //default return value (no sorting)
				})
			   		   			   
				console.log('TEST2');  //TEST
								
					
				for ( var i = 0, l = items.length; i < l; ++i ) {

					if(items[i] === undefined || items[i].theword === undefined || items[i+1] === undefined || items[i+1].theword === undefined ){
						
					} else if(items[i].theword === items[i+1].theword)  console.log(items[i].theword);
					else console.log(items[i].theword);
				}
	
			
            });
        });
    } 	
	
	function stopout() {    //REMOVE TERMS IN THESAURUS LISTED IN EXTERNAL STOPWORDS FILE
		
		var stopwords = require('./remove-stops.js');    //load resume terms in var resume_terms  (required, same format as collection term objects)
		var counter = 0;
		
		stopwords = stopwords.stops;
		console.log('STOPWORDS: ');
		for(var i = 0; i < stopwords.length; i++){
			console.log(stopwords[i]);
		}
	
        db.open(function(err, db) {
		
            if (err) { console.dir(err); }		
			
			stopwords.forEach(function(stopword  
			) {	//cycle through stop words
			
				thesaurus.find({theword : stopword}).toArray(function(err, items) {  //try to find stopword

					if (err) { console.dir(err); counter++;}

					else if(items[0] !== undefined && items[0] !== null && items.length !== 0){
						thesaurus.remove( items[0], function(err, doc) {});
						console.log(stopword + ' removed from thesaurus');
						counter++;
					}
					else counter++;
				   
					if(counter >= stopwords.length) setTimeout(function() {     db.close();  }, 1000);

				});
						
			});
        }); 

    } 	
	
	
	
	 function list() {     

            console.log('Your RSS feeds'.yellow.bold);
			
			var fs = require("fs");
			var urls = fs.readFileSync("rss_urls.js", "utf8");     //read files from external list (rss_urls.js)
			urls = JSON.parse(urls);
			//console.log(urls);       

                for (var i = 0, len = urls.length; i < len; i++) {
                    console.log(urls[i]);
					console.log(" - - - - - - - - - - - - - - - -");
                }
    }


	function read() {

		var counter = 0;
				
		//GET URLS
		var fs = require("fs");
		var urls = fs.readFileSync("rss_urls.js", "utf8");     //read files from external list (rss_urls.js)
		urls = JSON.parse(urls);	

        db.open(function(err, db) {			
		
		collection.ensureIndex( { "hash": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping

            if (err) { console.dir(err); }

			for(var j = 0; j < urls.length; j++){   //CYCLE THROUGH EXTERNAL RSS URLS

				var listings=[];
                request(urls[j]).pipe(new FeedParser())   // EXTERNAL RSS URL						
			
                    .on('error', function(error) {	console.log('!'); })
					
					.on('end', function(item) {					
										
									function async(arg, callback) {
				
										collection.insert({ "title" : arg.title, "description" : arg.description, "hash" : arg.hash, "time" : arg.time, "terms" : arg.terms, "link" : arg.link},	{safe: true, continueOnError: true}, function (err, document){ });
									
								//	  console.log('do something with \''+arg+'\', return 1 sec later');
									  setTimeout(function() { callback(arg * 2); }, 1000);
									}
									function final() { console.log('Done' /*, results */ ); db.close();}

									//var items = [ 1, 2, 3, 4, 5, 6 ];
									var items = listings;
									var results = [];

									items.forEach(function(item) {
									  async(item, function(result){
										results.push(result);
										if(results.length == items.length) {
										  setTimeout(function() { final();	 }, 1000);
										}
									  })
									});
												
						//setTimeout(function() { db.close();	 }, 1000);
									
						console.log('THE END'); 
					
					})
                    .on('data', function(item) {
					
						if(item.description != null && item.description != undefined && item.description.length > 100 ) {    //filter bad and short listings
                        
							item.description = item.description.replace(/\s{2,}/g, " ");  			     //space strip regex    
							item.description = item.description.replace(/(<([^>]+)>)/ig, "");  		     //html strip regex     		
							item.terms = sibyl.extract(item.description);							     //get terms and term values using Sibyl
							item.time = fancyTimeStamp(item.pubdate, true);
							//item.hash = simhash(item.description);	
							//item.hash = item.hash.join(""); 											//convert comma separated hash into string						
									
									
							//PARSE TITLE		
							var title_comps = item.title.split("-");		
								title_comps.forEach(function(comp){
								comp.replace('-', ''); 
								comp = comp.replace(/^\s+|\s+$/g, '');  //ditch dash and trim spaces
							}) 
							if(title_comps.length > 2  && title_comps[1] !== undefined && title_comps[2] !== undefined){
								item.employer = title_comps[(title_comps.length - 2)];  //load employer and location
								item.location = title_comps[(title_comps.length - 1)];
								
								title_comps = title_comps.slice(0, item.terms.length - 2);
								item.title = title_comps.join();
								
								var title_terms = sibyl.extract(item.title);
								
								for(var f = 0; f < title_terms.length; f++) item.terms.push(title_terms[f]);		
								
								if(title_comps.length > 3) item.terms.push({word: title_comps[1], count: 1, score: 90});  title_comps[0].concat(title_comps[1]);
								if(title_comps.length > 4) item.terms.push({word: title_comps[1], count: 1, score: 90});  title_comps[0].concat(title_comps[2]);
							} else {    //incase something went wrong
								item.employer = "None Given"; 
								item.location = "None Given";
								item.title = title_comps.join();
							} 
									
							//***SPECIAL HASH FORMULA
							var title_hash = simhash(item.title);									//***1) 128 bit binary hash of title and description 2) convert both to base 64 3) keep only first 5 digits
										//convert comma separated hash into string
							title_hash = title_hash.join('');																									
							
							var temp_hash = '';
							var sliver;
							for(var q = 0; q < 32; q++){
									sliver = title_hash.slice(q*4, q*4 + 4);								
									temp_hash = temp_hash.concat( parseInt(sliver , 2).toString(16) );
							}
							console.log('YIPPEE KIA: ' + temp_hash);
							
							title_hash = temp_hash;
																																									
							var title_buf = new Buffer(title_hash, 'hex');     
							title_hash = title_buf.toString('base64');		//convert hex to base64
							item.hash = title_hash.slice(0,9);             //remove digits from hash to economize
																																																	
							console.log('- - - - - - - - - - - - - - - -');
							console.log(item.title.bold);											
							console.log(item.description);   										
							console.log(item.terms);												
							console.log(item.time.grey);											
							console.log(item.link.magenta);											
							console.log(item.hash);
							console.log(item.employer);	
							console.log(item.location);								
							
							counter++;			
																														
							listings.push({
								"title" : item.title,	
								"description" : item.description,	
								"terms" : item.terms,
								"time" : item.time,
								"link": item.link,
								"hash" : item.hash,	
								"employer" : item.employer,
								"location" : item.location
								});								 																		
								
						console.log('Listings processed: ' + counter);
					//	console.log('Listings so far: ' + listings);
						console.log('Number of RSS URLs: ' + urls.length );   
					
						 }						 
					
                    });
					
					console.log(listings);
											
				}								
		
	//	db.close();
        });

    }	
		
	
	function tread() {

		var counter = 0;
				
		//GET URLS
		var fs = require("fs");
		var urls = fs.readFileSync("rss_urls3.js", "utf8");     //read files from external list (rss_urls.js)
		urls = JSON.parse(urls);	

        db.open(function(err, db) {
					
		
		treference.ensureIndex( { "hash": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping

            if (err) { console.dir(err); }

			for(var j = 0; j < urls.length; j++){   //CYCLE THROUGH EXTERNAL RSS URLS

				var entries=[];
                request(urls[j]).pipe(new FeedParser())   // EXTERNAL RSS URL						
			
                    .on('error', function(error) {	console.log('!'); })
					
					.on('end', function(item) {
					
										
									function async(arg, callback) {
				
										treference.insert({ "hash" : arg.hash, "time" : arg.time, "terms" : arg.terms},	{safe: true, continueOnError: true}, function (err, document){ });
									
									//  console.log('do something with \''+arg+'\', return 1 sec later');
									  setTimeout(function() { callback(arg * 2); }, 1000);
									}
									function final() { console.log('Done' /*, results */ ); setTimeout(function() { db.close(); }, 2000);}

									//var items = [ 1, 2, 3, 4, 5, 6 ];
									var items = entries;
									var results = [];

									items.forEach(function(item) {
									  async(item, function(result){
										results.push(result);
										if(results.length == items.length) {
										  final();
										}
									  })
									});
												
						//setTimeout(function() { db.close();	 }, 1000);
									
						console.log('THE END'); 
					
					})
                    .on('data', function(item) {
					
						if(item.description != null && item.description != undefined && item.description.length > 100 ) {    //filter bad and short listings
                        
							item.description = item.description.replace(/\s{2,}/g, " ");  			     //space strip regex    
							item.description = item.description.replace(/(<([^>]+)>)/ig, "");  		     //html strip regex     		
							item.terms = sibyl.extract(item.description);							     //get terms and term values using Sibyl
							item.time = fancyTimeStamp(item.pubdate, true);
							
							var desc_hash = simhash(item.description);								//***SPECIAL HASH FORMULA
							var title_hash = simhash(item.title);									//***1) 128 bit binary hash of title and description 2) convert both to base 32 3) keep only first 11 digits and combine into one string
							desc_hash = desc_hash.join('');												//convert comma separated hash into string
							title_hash = title_hash.join('');
							desc_hash = parseInt(desc_hash, 2 || 10).toString(32 || 10);			//convert binary to base 32
							title_hash = parseInt(title_hash, 2 || 10).toString(32 || 10);
							desc_hash = desc_hash.slice(0,11); 									//cut off last digits because they are out of the hash algo's range
							title_hash = title_hash.slice(0,11); 
							item.hash = desc_hash.concat(title_hash);													
																						//convert binary hash to hexidecimal
							
																						/*function base_convert(number, from_base, to_base) {
																							return parseInt(number, from_base || 10).toString(to_base || 10);
																						} */

							console.log('- - - - - - - - - - - - - - - -');
							console.log(item.title.bold);											 
							console.log(item.hash);   
						//	console.log(item.terms);												 
							console.log(item.time.grey);											
							
							counter++;							
														
							entries.push({
								"hash" : item.hash,
								"time" : item.time,
								"terms" : item.terms
								});								 																		
								
						console.log('Listings processed: ' + counter);
					//	console.log('Entries so far: ' + entries);
						console.log('Number of RSS URLs: ' + urls.length );  
					
						 }						 
					
                    });
					
					console.log(entries);
											
				}							
		
	//	db.close();
        });

    }	
	
	
	function generate() {		
		
		 db.open(function(err, db) {	 			
			
            if (err) { console.dir(err); }

            console.log('GENERATING PRIMARY THESAURUS INDEX FROM EXISTING REFERENCE DATA'.yellow.bold);

            treference.find().toArray(function(err, items) {
			
				setTimeout(function() { 
				
					if (err) { console.dir(err); db.close(); }

					else if (items.length === 0) { console.log('No reference data for thesaurus index generation!'); }

					else {
					
						setTimeout(function() { 
					
							items.forEach(function(ref_entry) {					
								console.log('- - - - - - PROCESSING TREFERENCE ENTRY - - - - - - -');
								
								thesaurus.ensureIndex( { "theword": 1 }, { unique: true, dropDups: true }, function(error) {}  );     //make field unique for auto deduping
																										
									ref_entry.terms.forEach(function(ref_term) {	
										
									//	setTimeout(function() { 
										
											var temphash = [];
											temphash = ref_entry.hash;
											
											var tempscore = [];
											tempscore = ref_term.score;

											var tempword = ref_term.word;
											
											//ONE
											if(ref_term.score > 40){    				//SCORE CUTTOFF FOR ENTRY OF TERMS INTO THESAURUS INDEX
												
												thesaurus.update(															
													{ theword: tempword },
													{	
														$addToSet: {thescore: tempscore},
														$addToSet: {docs: temphash} 
													},
													{upsert: true},
													
													function (err, document){ 
														console.log('Updated to thesaurus:' + tempword); 
														setTimeout(function() { db.close(); }, 2000);
												});  																				
											}
											
											//TWO
											if(ref_term.score > 30 && ref_term.score <= 40){    //SCORE CUTTOFF FOR ENTRY OF TERMS INTO THESAURUS INDEX
												
												thesaurus.update(															
													{ theword: tempword },
													{	
														$addToSet: {thescore: tempscore},
														$addToSet: {docs: temphash} 
													},
													{upsert: true},
													
													function (err, document){ 
														console.log('Updated to thesaurus:' + tempword); 
														setTimeout(function() { db.close(); }, 2000);
												});  																				
											}
											
											//THREE
											if(ref_term.score > 20 && ref_term.score <= 30){    //SCORE CUTTOFF FOR ENTRY OF TERMS INTO THESAURUS INDEX
												
												thesaurus.update(															
													{ theword: tempword },
													{	
														$addToSet: {thescore: tempscore},
														$addToSet: {docs: temphash} 
													},
													{upsert: true},
													
													function (err, document){ 
														console.log('Updated to thesaurus:' + tempword); 
														setTimeout(function() { db.close(); }, 2000);
												});  																				
											}
										
									//	}, 1000);
									
									});
						
							});
							
						}, 1000);
					
					}
                
				}, 1000);
				
            });

		//	setTimeout(function() { db.close(); }, 30000);
        });						
	
    }
	
	
	
	function purge_collections() {

        db.open(function(err, db) {

            if (err) { console.dir(err); }

            collection.remove( function(err, doc) {

                console.log("ALL DATA REMOVED FROM COLLECTION");
            //    db.close();
				
				treference.remove( function(err, doc) {

					console.log("ALL DATA REMOVED FROM TREFERENCE");
				//	db.close();
					
					thesaurus.remove( function(err, doc) {

						console.log("ALL DATA REMOVED FROM THESAURUS");
						db.close();

					});

				});

            });
			

	//	db.close();
        });

    }

    function help() {
        console.log('Scryer / ver. 0.0.7');
        console.log('Usage:');
        console.log('$ nr --read  // scrape and store RSS data');
		console.log('$ nr --tread  // scrape treference data');
		console.log('$ nr --treadgen  // scrape treference @ generate thesaurus index');
		console.log('$ nr --spool  // scrape @ generate through URL list');
		console.log('$ nr --generate  // generate thesaurus index');
		console.log('$ nr --lookup "<term1>" "<term2>"  // query thesaurus ave. relationship');
		console.log('$ nr --lookupdir "<term1>" "<term2>"  // query thesaurus directional relationships');
		console.log('$ nr --tscore    // rescore terms in external listing using thesaurus');
		console.log('$ nr --tcompare    // compare two documents using thesaurus');
        console.log('$ nr --data  // view job listing collection data');
		console.log('$ nr --tdata  // view treference collection data');
		console.log('$ nr --trdata  // view thesaurus collection data');
        console.log('$ nr --purge // clear all data from job listing collection');
		console.log('$ nr --tpurge // clear all data from treference collection');
		console.log('$ nr --trpurge // clear all data from thesaurus collection');
		console.log('$ nr --tprune // remove single occurence thesaurus entries');
		console.log('$ nr --tdedupe // remove single occurence thesaurus entries');
        console.log('$ nr --list  // list current feeds');
		console.log('$ nr --stopwords "<cutoff>"  // generate list of stopword candidates in "stopword-candidates.txt"');
		console.log('$ nr --stopout  // remove terms in "remove-stops.js"');
		console.log('$ nr --listingsamp  // pull some listings to text file');
		console.log('$ nr --purge_collections  // delete all collections (can break scryer)');
        console.log('$ nr --help  // command menu');
        console.log('JobHinge Rock On!'.rainbow);
    }

    return {
        data: data,
		tdata: tdata,
		trdata: trdata,
		lookup: lookup,
		lookupdir: lookupdir,
		tscore: tscore,
		tcompare: tcompare,
        purge: purge,
		tpurge: tpurge,
		trpurge: trpurge,
		tprune: tprune,
		tdedupe: tdedupe,
		purge_collections: purge_collections,
        list: list,
        read: read,
		tread: tread,
		treadgen: treadgen,
		spool: spool,
		stopwords: stopwords,
		stopout: stopout,
		listingsamp: listingsamp,
		generate: generate,
        help: help
    };

}();

if ( argv.data ) { Scryer.data(); }
else if ( argv.tdata ) { Scryer.tdata(); }
else if ( argv.trdata ) { Scryer.trdata(); }
else if ( argv.lookup ) { Scryer.lookup(); }
else if ( argv.lookupdir ) { Scryer.lookupdir(); }
else if ( argv.tscore ) { Scryer.tscore(); }
else if ( argv.tcompare ) { Scryer.tcompare(); }
else if ( argv.purge ) { Scryer.purge(); }
else if ( argv.tpurge ) { Scryer.tpurge(); }
else if ( argv.trpurge ) { Scryer.trpurge(); }
else if ( argv.tprune ) { Scryer.tprune(); }
else if ( argv.tdedupe ) { Scryer.tdedupe(); }
else if ( argv.purge_collections ) { Scryer.purge_collections(); }
else if ( argv.list ) { Scryer.list(); }
else if ( argv.read ) { Scryer.read(); }
else if ( argv.tread ) { Scryer.tread(); }
else if ( argv.treadgen ) { Scryer.treadgen(); }
else if ( argv.generate ) { Scryer.generate(); }
else if ( argv.stopwords ) { Scryer.stopwords(); }
else if ( argv.stopout ) { Scryer.stopout(); }
else if ( argv.listingsamp ) { Scryer.listingsamp(); }
else if ( argv.spool ) { Scryer.spool(); }
else if ( argv.help ) { Scryer.help(); }
else { Scryer.help(); }

