//*********** TAGGER CRASH FAILOVER
function altTagger(text){

	var out=[];

	text=text.replace(/^A-Za-z0-9\.\']/g,'');

	var working = text.split(' ');
	for (var i in working) {
		working[i] = working[i].trim();
		if (working[i].length>5) {
		  out.push([working[i],'XX']);
	   }
	}
	
	return (out);
}

console.log(altTagger('Repeats the p*revious item zero or more times. Greedy, so as many items as possible will be matched before trying permutations with less matches of the preceding item, up to the point where the preceding item is not matched at all.'));
