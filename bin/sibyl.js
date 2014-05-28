"use strict";
var pos = require('pos');
var Lexer = require('./lexer.js')

//Primary term object with attributes etc. 
function Term(){
	this.word = "empty";							//text of the term as a character string
	this.pos = "empty";								//term Part Of Speech (POS) tag
	this.frequency = 1;								//frequency of term in document
	this.score = 0;									//value of term based on attributes
	this.rank = 0;									//sequential rank based on value of all terms in document
	//eventualy try to do a prototype here
	this.acronym = false;							//is term all caps and probably an acronym?
	this.frontCapital = false;  	    			//is first letter capitalized but NOT after period/at beggining of sentence
	this.midCapital = false;						//does term have a capitalized letter in the middle?
	this.commaSeparated = false;					//is it between two commas?
	this.stop1 = false;								//is it in the stopword list? List one is shortest and has greatest negative impact on term value
	this.stop2 = false;								//is it in the stopword list? List one is mid length/value
	this.stop3 = false;								//is it in the stopword list? List one is longest and has least negative impact on term value
	this.contextLocal = 0;         				    //self generated high value context list based on top terms
	this.multiWordBool = false; 	    			//is it a two word compound term?
	this.multiComponent1 = 0;						//info on first component word, declare as Term when needed
	this.multiComponent2 = 0;						//info on second component word, declare as Term when needed
};


//***VALUE FUNCTION (WEIGHTING ALGORITHM)
Term.prototype.value = function(){
	//DECLARE AND ZERO OUT MODIFIERS
	this.frequencyMod = 0;
	this.lengthMod = 0;
	this.stopMod = 0;
	this.contextMod = 0;
	this.commaSeparatedMod = 0;
	this.midCapitalMod = 0;
	this.frontCapitalMod = 0;
	
	//CHARACTER LENGTH MODS
	if(this.word.length < 6) 	this.lengthMod = -8;
	if(this.word.length > 9) 	this.lengthMod = 1;
	if(this.acronym)			this.lengthMod = 0;

	//FREQUENCY MODIFIERS
	if(this.frequency > 8){          
								this.frequencyMod = 10;    	 		   //if term frequency is greater than 8, frequency value modifier   = 10
	} else if(this.frequency > 6){
								this.frequencyMod = 9;					//if term frequency is between 7 and 8, frequency value modifier  = 9
	} else if(this.frequency > 4){
								this.frequencyMod = 8;					//if term frequency is between 5 and 7, frequency value modifier  = 8
	} else if(this.frequency > 2){
								this.frequencyMod = 6;					//if term frequency is between 4 and 3, frequency value modifier  = 6
	} else if(this.frequency > 1){
								this.frequencyMod = 4;					//if term frequency is equal to 2, frequency value modifier       = 10
	} else{ this.frequencyMod = 0; }
		
	//STOP WORD MODIFIERS
	if(this.stop1) 				this.stopMod = -28;    					//if term is on stop word list 1
	if(this.stop2) 				this.stopMod = "in dev";				//if term is on stop word list 1
	if(this.stop3) 				this.stopMod = -24;						//if term is on stop word list 1
		
	//PUNCTUATION MODIFIERS	
	if(this.acronym)			this.acronymMod 	 = 4;
	if(this.frontCapital)		this.frontCapitalMod = 3;
	if(this.midCapital)			this.midCapitalMod   = 3;
	
	//MULTI WORD TERM ADJUSTMENT FUNCTION
	if(this.multiWordBool) 		this.multiComponentValue();
		
	//CALCULATE SCORE
	this.score = 50 + this.frequencyMod + this.lengthMod + this.stopMod + this.commaSeparatedMod + this.frontCapitalMod + this.midCapitalMod; // + this.multiWordMod;
};

//THIS FUNCTION ADJUSTS THE VALUE FUNCTION FOR MULTI WORD TERMS
Term.prototype.multiComponentValue = function(){  	
	//run the components through the value function
	this.multiComponent1.multiWordBool = false;
	this.multiComponent2.multiWordBool = false;
	this.multiComponent1.value();
	this.multiComponent2.value();

	//adjust modifiers
	this.lengthMod = ((this.multiComponent1.lengthMod + this.multiComponent2.lengthMod) / 2);
	if( (this.multiComponent1.stopMod > 10) && this.multiComponent2.stopMod > 10){
		this.stopMod = this.multiComponent1.stopMod + this.multiComponent2.stopMod;
	} else { this.stopMod = ((this.multiComponent1.stopMod + this.multiComponent2.stopMod) / 9);}
	this.frequencyMod = this.frequencyMod + ((this.multiComponent1.frequencyMod + this.multiComponent2.frequencyMod) / 2);
	this.acronymMod = this.multiComponent1.acronymMod + this.multiComponent2.acronymMod;
	this.midCapitalMod = this.multiComponent1.midCapitalMod + this.multiComponent2.midCapitalMod;
	this.frontCapital = this.multiComponent1.frontCapital + this.multiComponent2.frontCapital;
};

//Reference lists for search and comparison against term 
function StopReference(){
	this.stopword1 = ["XX", "salary", "job", "A", "jobs","cover","letter","contact","tool","role","person","apply","salary","history","requirements","education","history","ability","skill","proficiency","work","road","street","place","suite","room","time","skills","performance","experience","representation","excellent","time","relationship","somebody","participate","participation","quality","responsible","responsibilities","qualify","qualifications","capacity","country","issue","issues","order","user","position","equivalent","knowledge","supports","candidates","duties","duty","include","facility","candidate","summary","people","familiar","familiarity","request","requests","primary","secondary","employee","employees","employ","employer","employment","relationship","relationships","one","two","three","four","five","six","seven","eight","nine","ten","preferred","compensation","compensate","functions","function","year","years","month","months","day","days","commitment","willingness","application","follow","values","growth","belief","culture","require","required","mission","program","programs","substantial","organization","description","information","background","backgrounds","company","companys","initiative","questions","question","answer","answers","follow","following","interview","interviews","posses","report","reports","right","left","everyone","decision","decisions","benefit","benefits","presence","opportunity","thousand","million","word","interest","talent","talented","talents","today","todays","countries","identity","level","value","sense","task","tasks","location","ideal","must","date","standard","standards","detail","details","emphasis","basis","hours","communication","orientation","management","materials","flexibility","opportunities","responsibility","office","print","you'll","applicants","applicant","attention","services","status","expertise","activity","activities","characteristics","expenses","title","applications","professionals","professional","service","department","aptitude","minute","result","email","emails","availability","employers","offices","expense","first","other","valid","type","both","base","setup","area","needed","need","support","qualities","staff","others","none","term","decisiveness","consideration","group","groups","world","personal","personnel","dedication","individual","individuals","supplies","conduct","competency","teamwork","positions","facilities","integrity","change","excellence","productivity","difficulty","relations","relation","state","action","projects","open","strong","direction","high","face","were","such","idea","ideas","thats","at","dont","stuff","things","well","will","trust","nice","mind","care","have","youd","pair","part","wage","terms","areas","focus","point","works","asset","items","professionalism","functionality","including","volume","diligence","integral","openings","desire","basic","arent","share","array","meets","essential","equal","quality","identification","full","flow","sites","final","sets","side","reference","whom","when","number","discipline","capabilities","appropriate","life","line","member","extent","career","concepts","purpose","conditions","objectives","additional","satisfaction","NOTE","online","qualification","selection","preference","vacation","abilities","processes","resource","numbers","human","below","character","center","resume","which","more","proof","item","multiple","eligibility","operations","submission","includes","view","form","page","career","minimum","more","red","yellow","blue","orange","black","white","titles","salary","worker","basis","click","unit","above","new","behavior","products","past","someone","check","offer","short","use","visit","over","hour","selfstarter","insight","religion","priority","monday","tuesday","thursday","friday","saturday","sunday","january","february","march","april","may","june","july","august","september","october","november","december","second","changes","sample","enter","sames","links","control","period","dates","large","north","shift","event","link","lots","LLC","llc", "NY", "york", "0","•experience","•maintain","•work","abilities","able","access","accomplishment","acknowledgement","acre","action","activities","activity","acuity","address","affair","affiliation","afternoon","AGENCY","agenda","alabama","align","AM","americas","answer","answer question","antonio","anyone","applicant","applicant","applicant responsibility","application deadline","application material","application process","application statu","application system","applications","approache","aptitude","AREA","arizona","arlington","aspect","assistive","atlanta","attitude","attribute","august","austin","australia","authorization","availability","avenue","awareness","AZ","bachelor","background","background check","belief","bend","benefit","benefit package","benefits","body","bonu","boot","boston","bottom","breadth","break","broad","brooklyn","business hour","california","california driver","california state","capability","CAREER","career path","careerbuilder","carry","category","center","CENTER","central","chance","change","chapter","characterization","charlotte","chicago","choice","cincinnati","circumstance","click","click button","click link","colleague","colorado","columbia","comment","common","communicator","comparison","compensable","compensation plan","competencies","compilation","completeness","complication","comprehension","comprehensive benefit","conclusion","conditions","conduct","conformance","connecticut","consequence","consideration","consistency","contact information","context","contingency","control","cooperation","coordination","core","correction","counter","credit check","crise","criteria","custom","dallas","DATE","date","DAYS","decade","december","declaration","deep","default","delay","demotion","denial","dental insurance","denver","department","dependability","depth","description","desire","detail","detection","diego","diem","direction","disability insurance","discharge","disclaimer","discretion","division","don’t","dozen","drag","dress","drug","drug screen","drug test","duties","DUTIES","education high","education level","effect","effort","eight year","eighteen","eligibility","email address","employee referral","employee statu","employment","employment history","employment opportunity","employment verification","encounter","encouragement","endeavor","entry","equal opportunity","equivalent","everyone","example","examples","excellence","exceptional","exceptional compensation","exertion","exit","expectation","experience ability","experience click","experience education","experience equivalent","experience high","experience minimum","experience year","extent","factor","feet","fellow","finalize","fine","first step","first time","FL","florida","florida statute","focu","folder","follows","form","fortune","forum","francisco","free","friday","front","future opportunity","future vacancy","GA","gain","general summary","generation","georgia","goal","goodwill","grand","GREAT","green","group","hard","hartford","hawaii","healthcare system","HIGH","hill","holder","holds","hole","honesty","hour","houston","human","hundred","idaho","ideal candidate","identification","II","III","IL","illinois","immediate","impression","incident","include","inclusiveness","indiana","indianapolis","individual","info","inform","instance","integrity first","interest","invitation","involvement","iowa","irregularity","jack","jersey","JOB","job summary","jobaline","jobelephant","JOBS","john","julie","kansas","kansas city","kentucky","knowledge ability","lean","length","level","light","limitation","linkedin","list","live","load","louisiana","loyalty","madison","maker","manhattan","maryland","master","match","matter","member","miami","michigan","middle","million","milwaukee","minimum","minimum education","minimum qualification","minimum requirement","minneapolis","minnesota","misdemeanor","mission","mississippi","missouri","MO","mode","monday","monster","month","month experience","movement","multiple","nationality","nebraska","necessity","NEED","neglect","nevada","NJ","NM","north carolina","note","NOTE","notice","NY","NYC","objective","occasion","offering","OFFICE","OH","ohio","oklahoma","oklahoma city","opening","opportunity","opportunity employer","oregon","orient","origin","other","overview","pacific northwest","pack","pain","part","participant","penetration","pennsylvania","people first","performance expectation","performance requirement","period","perk","permission","personnel policy","perspective","phoenix","PI","piece","pittsburgh","placement","plenty","PM","portion","position","position description","posses","possession","possibility","pound","precision","presence","probation","probationary period","progression","proportion","puerto","puerto rico","push","QA","qualification high","quality","quantity","résumé","race","raleigh","reach","reason","reasoning ability","record check","reference check","regular","rejection","relationship","remain","replacement","request","required","requirement education","requirement minimum","resource","resources","response","responsibilities","responsiveness","restriction","return","revision","richmond","right person","round","rule","sacramento","safe","salary","salary history","sale meeting","saturday","savannah","SC","scenario","searche","seattle","second","sector","secure","secures","seek","select","selectee","selection process","september","setting","shine","shortage","show","sight","situation","SKILL","skill","skill ability","skill experience","skill knowledge","SKILLS","someone","sound judgment","south","south carolina","south florida","specialty","sponsor","stability","stack","statu","status","stock","stream","strength","subject","submit","substance","subtraction","success","successe","suitability","sunday","surrounding","suspicion","switch","switche","table","tampa","task","TEAM","that","third","thirty","thoroughness","thought","thousands","three month","three type","thursday","time","time employee","TN","tomorrow","topic","trial period","truth","tuesday","twenty","type regular","universal","upper","usajobs account","usascover","utah","vacancy announcement","vacation time","value diversity","variation","version","virginia","vision ability","vision coverage","vision insurance","volume","warrant","washington state","we’re","we’ve","wednesday","week","weekend","welcome","west","WI","willingness","wisconsin","withdrawal","work","work environment","work experience","work history","work relationship","workday","works","WV","year","year management","year work","years’","years’ experience","york","york city","york state","you’ll","you’ll work","you’re","you’ve"];
	this.stopword2 = ["comingSoon"];
	this.stopword3 = ["XX", "anticipation", "season", "business", "relationship", "com", " ", "peak", "dispute", "order", "perseverance", "vibrance", "WWW", "revenue", "sale", "city", "NY", "advisory","strategy","major","processe","proposal","requisition","master","data","article","agency","analytic","enablement","salary","0","12:00 PM","00 p m","00 telecommute option","00 vacancy","000 discou","000 employees","000 employees bp","000 people","000 stores","1a","a","abilities","abilities ability","abilities knowledge","abilities ksas","ability","ability ability","able","about","above","absence","abst","acceptance","access","accident","accommodation","accommodations","accomplishment","accomplishments","accordance","according","accordingly","accountabilities","accountability","accreditation","accredited","accredited institution","accredited school","accredited university","accuracy","achievement","achievements","acquisition","across","act","action","action employer","action employer m f","action employer m f v","action plans","actions","activities","activities customers","activity","activity requirements","actually","acuity","acumen","adaptability","added","addition","additional","address","address issues","addresses","adequacy","adherence","adj","adjustments","admission","adoption","adult","adults","advanc e","advance","advancement","advancement opportunities","advances","advantage","advice","advocate","af dcips employees","affairs","affected","affecting","affects","after","afterwards","again","against","age","age groups","age sex","agencies","agility","ago","agreement","agreements","ah","aids","alabama","albuquerque","alignment","all","allocation","almost","alone","along","already","also","alternative","alternative format","alternatives","although","always","am","america","american","americans","america's","among","amongst","amoungst","amount","amounts","amp","an","analysis","and","announce","announcement","annuitants applicants","annuitants click","another","answer","answer questions","answers","answers button","antonio","any","anybody","anyhow","anymore","anyone","anything","anyway","anyways","anywhere","apparently","appearance","applicant","applicant pool","applicants","application","application materials","application process","application questionnaire","application status","applications","apply","apply'","appointments","appreciation","approach","approaches","appropriate","appropriateness","approval","approvals","approximately","april","aptitude","are","area","areas","aren","arent","arise","arizona","arm","around","arrangements","array","as","asap","aside","ask","asked","asking","asks","asp","aspect","aspects","assemblies","assessment","assessment questionnaire","assessments","asset","assets","assignment","assignments","assistance","associates","association","assortment","assumptions","assurance","at","atlanta","attainment","attendance","attention","attitude","attributes","audience","audiences","august","austin","auth","authorities","authority","authorization","availability","available","award","awards","awareness","away","awfully","az","b","back","backed","background","background check","background checks","background investigation","backgrounds","backing","backs","baltimore","bar","barriers","base","base salary","basic","basis","be","became","because","become","becomes","becoming","been","before","beforehand","began","begin","beginning","beginnings","begins","behalf","behavior","behind","being","beings","belief","beliefs","believe","below","benefit","benefit package","benefits","benefits package","beside","besides","best","better","between","beyond","big","bill","billion","billion fortune","biol","bit","black","block","blue","board","bodies","body","bonus","bonuses","both","bottom","boundaries","box","bp group","branch","branch performance","breadth","brief","briefly","broadband communications consumer devices healthcare","bsn","buffalo","business","business days","business hours","business partners","business relationships","business waterworks job type","but","button","by","c","c c","ca","calendar","calendar days","california","call","came","campus site","can","canada","candidate","candidates","cannot","cant","can't","capabilities","capability","capacities","capacity","capital","card","cardboard","care","care st vincent","career","career move we're","career opportunities","career opportunity","career path","careerbuilder","careers","carolina","carrier position","cart","carts","case","case basis","caseload","cases","cash fund","categories","category","cause","causes","cdl","center","centers","century","certain","certainly","certificate","certification","certifications","cf industries","cfr","chain","challenge","challenges","chance","change","changes","channels","character","characteristics","charge","charges","charlotte","check","chicago","choice","circumstances","cities","citizen","citizenship","city","clarification","clarity","class","classes","classification","cleanliness","clear","clearly","click","'click","client","client relationships","client requirements","clients","close","closure","co","co workers","coast","code","codes","collaboration","colleagues","colleague's","collection","collections","college","college degree","columbia","com","combination","come","comes","comfort","comfort level","command","comments","commission","commitment","commitments","committee","commonwealth","communicates","communication","communication skills","communication skills ability","communication skills both","communication skills experience","communicator","communities","community","companies","company","company description","company guidelines","company policies","company policy","company security practices","company standards","companys","company's","compensate","compensation","compensation package","compensation packages","competence","competencies","competency","competition","completeness","completion","complexity","compliance","composure","con","concentration","concept","concepts","concerns","conclusion","conclusions","condition","conditions","conduct","confidence","configure","conflict","conformance","conjunction","connection","connections","consideration","considerations","consistency","constraints","consultant","consultants","contact","contact information","contacts","contain","containing","contains","content","contents","context","continuity","continuum","contractors","contribution","contributions","contributor","control","controls","conversation","conversations","conversion","cooperation","coordinates","coordination","copies","copy","core","core competencies","core values","corp","correction","corrections","correspondence","correspondence ability","cost","could","couldnt","council","countertop plan","counties","countries","countries invista","country","country's","county","course","course work","courtesy","cover","cover letter","cover page","coverage","coworkers","creation","creativity","credentials","credibility","criteria","cross","crouch","crowd","crumbs","cry","culture","curriculum","curriculum vitae","customer","customer requirements","customer service leadership","customers","customer's","customers ability","cv","cycle","d","dallas","damage","date","date applicants","dates","day","days","dc","de","deadline","deadlines","deadlines ability","deal","december","decision","decision makers","decisions","decisiveness","dedication","defense te connectivity","deficiencies","definition","degree","degree level","degrees","delivery","demand","demands","demeanor","demonstration","denver","department","department policies","departments","deployment","deposit","depth","depth experience","depth knowledge","describe","description","description job summary","desire","desk","destination","detail","detail ability","details","determination","dev panda","development","developments","dice","did","didn't","differ","difference","differences","different","differently","difficulties","difficulty","dignity","diligence","diploma","direction","directions","directives","disabilities","disabilities act","disability","disability persons","discharge","discipline","disciplines","discounts","discovery","discrepancies","discretion","discrimination","discussions","display","displays","disposal","disposition","disqualification","dissemination","distance","distribution","district","diversity","division","divisions","do","documentation","documents","documents section","dod","dod policy","does","doesn't","doing","done","dont","don't","doors","down","downed","downing","downs","downwards","draft","drawer","drive","drives","drop shipment categories","drug","drug screen","drug test","drug use","drugs","due","duluth","duration","during","duties","duties amp responsibilities","duties responsibilities","duty","duty service","e","e mail","each","early","ecc","ed","edge","edu","education","education bachelor","education credentials","education degree","education education","education experience","education experience skills","education program","education requirement","education requirements","eeo","eeo aa employer m f","effect","effectiveness","effects","efficiencies","efficiency","effort","efforts","eg","eight","eighty","either","element","elements","eleven","eligibilities","eligibility","eligibility documentation sf","eligibility qualifications","eligibility requirements","else","elsewhere","email","email notification","email subject line","emails","emergency","emphasis","employ","employee","employee encounters","employee handbook","employees","employer","employer job code","employers","employment","employment authorization","employment eligibility","employment i e hours","employment opportunities","employment opportunity","employment relationship","empty","end","ended","ending","ends","enforcement","engagement","engagements","engages","english","english both","english language","enhancement","enhancements","enough","enrollment","enter","enterprises","enthusiasm","entities","entries","entry","environment","environments","eoe","equal","equivalent","equivalent ability","equivalent combination","equivalent education","equivalent experience","equivalent work experience","errors","escalation","especially","essential","establishment","estimates","et","et-al","etc","ethics","evaluation","evaluation criteria","evaluations","even","evenings","evenings weekends","evenly","event","events","ever","every","everybody","everyone","everything","everywhere","evidence","evolution","ex","examination","example","examples","excellence","excellent","except","exception","exceptions","exchange","execution","exercise","exercise selection priority","exhibit","expansion","expectation","expectations","expense","expenses","experience","experience applicants","experience click","experience credit","experience education","experience equivalent","experience experience","experience knowledge","experience one","experience qualifications","experience requirements","experiences","expert","expert knowledge","expertise","exposure","expression","ext","extension","extent","extremities","f","face","faces","facets","facilities","facility","fact","factor","factors","facts","failure","faith","fall","familiar","familiarity","families","far","fax","fax number","fax transmission","fda","feasibility","features","february","fee","feedback","fees","fellow employees","felt","few","ff","field","fields","fifteen","fifth","fify","figures","fill","final","find","findings","finds","finger","fingers","fire","firm","first","first day","first year","five","five years","five years experience","fix","fl","flexibility","florida","flow","fluency","focus","follow","followed","following","follows","for","force","forefront","form","former","formerly","fort","forth","fortune","forty","found","foundation","four","four digits","four year college","four years","freedom","frequency","fri","friday","friend","friends","from","front","fryer","fulfillment","full","fully","fumes","fun","function","functionality","functions","fundamentals","further","furthered","furthering","furthermore","furthers","future","fx","g","g e","ga","gain","gainesville","galleria","gaps","gave","general","generally","generation","geography","georgia","get","gets","getting","give","given","gives","giving","globe","go","goal","goals","goes","going","gone","good","goods","got","gotten","gpa","grade","grade level","graduate","graduates","graduation","gram implementation","great","greater","greatest","greensboro","ground","grounds","group","grouped","grouping","groups","growth","growth opportunities","growth opportunity","gt","guest","guidance","guide","guidelines","h","had","hand","hands","happens","hardly","has","hasnt","hasn't","have","haven't","having","hazards","he","health care reimbursement","healthcare provider","hed","hence","her","here","hereafter","hereby","herein","heres","hereupon","heritage","hers","herself","hes","hi","hid","high","higher","highest","hills","him","himself","his","history","hither","holiday","holidays","home","home office","honesty","hope","hour","hour shifts","hours","hours day","houston","how","howbeit","however","hr","hrs","human","hundred","hundreds","hz","i","i e","icd","id","idea","ideal","ideas","identification","identity","ie","if","ii","i'll","illinois","im","image","immediate","immediately","impact","impacts","implementation","implements","implications","importance","important","improvement","improvements","in","inc","incentives","inception","incidents","include","includes","including","inclusion","increase","incumbents","indeed","independence","index","individual","individuals","industries","industry","industry experience","industry leader","industry's","influence","information","information ability","information click","initiation","initiative","initiatives","innovation","innovations","input","inquiries","insight","insights","inspection","installation","instead","institute","institutes","institution","institutions","instruction","instructions","integral","integral part","integrity","intent","interaction","interactions","interest","interested","interesting","interests","interfaces","interpretation","interruptions","intervention","interventions","interview","interview process","interviews","into","introduction","invention","investigation","involvement","inward","is","isn't","issuance","issue","issues","it","itd","item","items","it'll","its","it's","itself","i've","j","j m smucker company","jacksonville","january","jersey","job","job announcement","job applicants","job block","job block view","job description","job descriptions","job details","job duties","job experience","job function","job functions","job id","job knowledge","job number","job offer","job qualifications","job qualifications completion","job requirements","job requirements page","job requirements page ability","job responsibilities","job summary","job title","jobs","judgment","july","jun","june","just","k","k n owl e dge","k plan","k retirement plan","kansas","keep","keeps","kept","kg","kind","kinds","km","knew","know","knowledge","knowledge experience","knowledge skill","knowledge skills","knowledge skills abilities","knowledge skills amp abilities","known","knows","ky","l","l e m pl oym e nt","large","largely","las","last","lately","later","latest","latitude","latter","latterly","lbs","lead","lead capacity","leader","leaders","leadership","learner","learners","least","left","length","less","lessons","lest","let","lets","letter","letters","level","level experience","levels","leverage","leverages","liaison","license","lieu","life","lifestyle","lights","like","liked","likely","limit","limitations","limits","linde group","line","lines","link","links","list","list air force employee","lists","little","lives","'ll","llc","location","locations","log","long","longer","longest","look","looking","looks","losses duties","lot","lots","louis","love","ltd","m","made","mainly","maintenance","majority","make","makes","making","man","manageability","management","manhattan","manner","manner ability","manuals","many","march","masters degree","material","materials","matter","matters","may","maybe","md","me","meals","mean","means","meantime","meanwhile","measure","medium","meetings","meets","member","members","membership","memphis","men","menu","merchandise order zones","merchandise presentation guidance work experience","merely","message","messages","method","methodology","methods","mexico","mg","mh","mi","michigan","middle","midnight","might","miles","milestones","mill","million","million people","millions","milwaukee","mind","mine","minimum","minneapolis","minnesota","minorities","minute","minutes","miss","mission","mission statement","missouri","mix","ml","mn","mo","modification","modifications","modules","monday","monies","monitors","monster","month","month contract","month end","month year","months","months basis","months experience","more","moreover","mos afsc","most","mostly","motivation","move","movement","mr","mrs","much","mug","multi","multiple","multitask","murray","must","my","myself","n","na","name","name address phone number","namely","names","nation","nation's","nature","nay","nd","near","nearly","necessarily","necessary","need","needed","needing","needs","neither","networks","never","nevertheless","new","newer","newest","next","nice","night","nights","nights weekends","nine","ninety","nj","no","nobody","noise","non","none","nonetheless","noone","nor","normally","north","nos","not","NOTE","noted","notes","nothing","notice","notification","november","now","nowhere","ns t rat e","number","number one","number sequence","numbers","nurse rn","nv","ny","o","object","objections","objective","objectives","objects","observations","obstacles","obtain","obtained","obviously","occasion","october","of","off","offenders","offer","offerings","office","office environment","office procedures","offices","official","often","oh","ohio","ok","okay","oklahoma","old","older","oldest","omissions","omitted","on","once","one","one copy","one hour","one nineteen home health care","one time","one year","one year experience","one year probationary period","ones","online","only","onsite","onto","open","opened","opening","openings","opens","operation","operations","operations core competencies","opm form","opportunities","opportunity","opportunity employer","opportunity employer applicants","opportunity employer drug","opportunity employer eoe","opportunity employer m f","opportunity employer segment","opportunity employers","option","options","or","orange","ord","order","ordered","ordering","orders","org","organization","organization ability","organization eoe aa m f","organization skills","organizations","orientation","orientation ancestry","orientation gender identity","origin","origin age","origin age disability","origin disability","other","others","others ability","otherwise","ought","our","ours","ourselves","out","outcome","outcomes","output","outreach","outside","oven grill deef","over","overall","oversight","overtime","overview","overview benefits","owing","own","owner","ownership","p","p m","pace","packages","page","pages","pair","paper","parameters","parents","part","parted","participant","participants","participate","participation","particles","particular","particularly","parting","partner","partners","partnership","partnerships","parts","past","paste","path","patience","patient","patient care","patients","patterns","payment","payments","pdf","peers","pennsylvania","people","per","percent","percentages knowledge","performance","performance reviews","performance standards","perhaps","period","periods","perks","permission","person","personal","personality","personnel","persons","person's strengths","perspective","perspectives","ph","phase","phases","philadelphia","philosophy","phoenix","phone","phones","picture","pieces","pipeline","pittsburgh","place","placed","placement","places","plan","plans","plant","platform","platforms","please","plenty","plus","pm","point","pointed","pointing","points","policies","policies procedures","policy","pool","poorly","portion","portions","position","position applicants","position click","position comments","position description","position email","position end date level","position experience","position requirements","position responsibilities","position summary","position type","position works","positions","positions subject","posses","possession","possibilities","possibility","possible","possibly","post","post offer pre placement drug test","potentially","pounds","pounds ability","power","pp","practice","practices","practices ability","pre","pre employment","pre employment drug","pre employment substance abuse","pre employment tests","pre placement verification","predominantly","preference","preferences","preferred","premier","preparation","presence","present","presented","presenting","presents","pressure","preview questions","previously","pride","primarily","primary","principles","print","priorities","prioritization","prioritize","priority","privacy","prn","proactive","probably","problem","problems","problems ability","procedure manuals ability","procedures","procedures ability","process","process improvements","processes","product lines","production environments","productivity","products","professional","professionalism","professionals","proficiency","profile","profit","profit organization","program","program requirements","programs","progress","project","project status","project team members","projects","promise","promotion","promotions","promptly","proof","properties","prospects","proud","provider","provides","provision","provisions","pto","publications","punctual","punctuation","purpose","purposes","pursuit","put","puts","putting","q","qualification","qualification determinations","qualification requirements","qualifications","qualifications ability","qualifications determinations","qualifications education","qualifications experience","qualifications knowledge","qualifications one","qualifications requirements","qualify","qualities","quality","quality assurance","quality issues","quality results","quality service","quality services","quality solutions","quality standards","quality work","quantities","quantity","que","question","questionnaire","questionnaire responses","questionnaire view","questions","quickfind","quickly","quite","qv","r","r amp","r ce","r g","r l schedule","r sum","race color","race color religion","race color religion gender","race color religion sex","ran","range","ranges","rank dates","rapport","rate","rates","rather","rd","re","re t","readily","readiness","reality","really","reason","reasons","recent","recently","recognition","recommendation","recommendations","reconciliation","record","records","recovery","red","ref","reference","references","referrals","refs","regard","regarding","regardless","regards","region","regions","registration","regulations","reinstatement rights","related","relation","relations","relationship","relationships","relatively","release","reliability","religion","relocation","relocation assistance","relocation expenses","relocation package","removal","removal date","replacement","report","reports","representation","representative","reputation","request","requests","require","required","requirement","requirements","requirements ability","requisition id","requisition number","research","residence","residency","residents","resilience","resolution","resource","resources","resources department","respect","respectively","response","responses","responsibilities","responsibilities duties","responsibility","responsible","rest","restrictions","restroom","result","resulted","resulting","results","resume","retention","retention incentives","retirement plan","retirement separation","return","review","reviews","reviews dollar general's","reviews intermountain healthcare","reviews jpmorgan chase","revisions","reward","rewards","right","right candidate","right people","rights","rise","risk","rn","rn license","road","roadmap","role","role model","roles","roll","room","rooms","root cause","rotation","rounds","route","rules","run","s","safety","safety regulations","safety rules","said","saint","salaries","salary range","salary requirements","sales assoc ft","same","sames","sample","san","san francisco","satisfaction","saturday","saw","say","saying","says","scale","schedule","schedule type","schedules","school degree","school diploma","school graduate","school graduation","school level","scope","score","scratch","screen","screens","search","seattle","sec","second","secondary","seconds","section","sections","sector","secure","securities","security number","security policies","see","seeing","seem","seemed","seeming","seems","seen","sees","selection","selection priority","selection process","selection process applicants","selection process bp","self","self starter","selfstarter","selves","semi","sense","sensitivity","sent","sentences","september","sequence","series","serious","service","service career career","service i e","services","services firm","services multi specialty clini","services schedule","sessions","sets","settings","setup","seven","seven years","several","sf","shall","shape","share","she","shed","she'll","shes","shield","shift","shift day job employee status","shift details","shift work","shifts","short","should","shoulder","shouldn't","show","show proof","showed","showing","shown","showns","shows","si organization inc","side","sides","sign","signature","signatures","significant","significantly","silver spoon","similar","similarly","since","sincere","site","sites","situation","situations","six","six continents","six months","six years","sixty","size","skill","skill level","skill sets","skills","skills ability","skills attention","skills experience","skills knowledge","skills proficiency","slightly","small","smaller","smallest","smile","so","society","solution","solutions","some","somebody","somehow","someone","somethan","something","sometime","sometimes","somewhat","somewhere","sonoma county","soon","sorry","sound decisions","source","sources","space","spaces","specialization","specialties","specialty","specialty area","specifically","specifications","specified","specify","specifying","spectrum","spirit","sponsorship","springs","sr","st re n g","stability","staff","staff meetings","staff members","stage","stages","stakeholders","stand","standard","standardization","standards","start","state","statement","statements","states","station","status","status reports","step","steps","still","stipend","stock availability","stocker","stop","stories","strategies","street","strength","strengths","stress","strong","strongly","structure","structures","study","stuff","style","styles","sub","subject","subject matter","subject matter expertise","subject matter experts","submission","submissions","submit","subordinates","subsidiaries","subsidiary","substances","substantial","substantially","substitute","success","successfully","such","sufficiently","suggest","suggestions","suitability","suite","summary","summer","sunday","sup","supervision","supervision ability","supervisor","supervisors","supervisors management staff","supplies","support","supports","sure","surfaces","system","systems","systems experience","t","table","tables","take","taken","taking","talent","talented","talents","target","task","tasks","tasks ability","tasks responsibilities","tdd","team","team ability","team atmosphere","team environment","team environment ability","team member","team members","team player","team work","teams","teamwork","technique","techniques","techniques ability","technologies","technology","telephone","tell","ten","ten years","tends","term","term disability","term positions","term relationships","terminal","termination","terminology","terms","territories","territory","test","test plans","texas","th","than","thank","thanks","thanx","that","that'll","thats","that's","that've","the","their","theirs","them","themselves","then","thence","theory","there","thereafter","thereby","thered","therefore","therein","there'll","thereof","therere","theres","thereto","thereupon","there've","these","they","theyd","they'll","theyre","they've","thickv","thin","thing","things","think","thinker","thinks","third","this","those","thou","though","thoughh","thought","thoughts","thousand","thousands","three","three core competencies","three core values integrity first service","three months","three references","three years","three years experience","throug","through","throughout","thru","thursday","thursday june","thus","til","till","time","time ability","time basis","time constraints","time employees","time experience","time frame","time job","time job type","time management","time part time","time position","time term","time travel","timeframes","timelines","timeliness","times","timestamp","tip","title","titles","tn","to","today","todays","together","tons","too","took","tool","tools","top","topics","totes stock merchandise","touch","toward","towards","track record","tradition","trainings","transactions","transcript","transcripts","transfer","transfers","transformation","transition","transport","travel","travel arrangements","travel percentage none relocation","treatment","tried","tries","trillion","trouble","truly","trust","try","trying","ts","tuesday","tuition reimbursement","turn","turned","turning","turns","twelve","twenty","twice","twist","two","two weeks","two years","two years experience","tx","type","types","u","un","under","unfortunately","unit","units","university","unless","unlike","unlikely","until","unto","up","updates","upload","upon","ups","urgency","us","usa","usage","usajobs account","use","use cases","use hands","used","useful","usefully","usefulness","user","users","uses","using","usually","utilities","utilization","v","v drug","v intermountain healthcare","v kpmg","va","vacancies","vacancy","vacancy announcement","vacancy id","vacation","vacation time","vacations","valid","validation","validity","valley","value","values","variables","variances","variety","various","vc","'ve","vegas","vendors","verification","verifies","version","very","veteran status","veteran status jobserve usa","veterans' preference","via","view","vigilance","violations","virginia","visa status","visibility","vision","vision abilities","vision benefits","vision coverage","vision depth perception","vision distance vision color vision","vision insurance","vision life","vision life insurance","vision orbits","visit","visits","viz","vol","vols","volume","volunteers","vp","vs","vta","w","wa","wage","wages","want","wanted","wanting","wants","was","washington","washington state department","wasn't","waste","water","waterworks requisition","way","ways","we","weather","web site","wed","week","weekend","weekend hours","weekend work","weekends","weeks","weight","weights","welcome","well","we'll","wells","went","were","we're","weren't","werks","west","we've","what","whatever","what'll","whats","what's","when","whence","whenever","where","whereafter","whereas","whereby","wherein","wheres","whereupon","wherever","whether","which","while","whim","white","whither","who","whod","whoever","whole","who'll","whom","whomever","whos","whose","why","wi","widely","will","willing","willingness","wisconsin","wish","with","within","without","won't","word","words","work","work activities","work area","work areas","work assignment","work assignments","work authorization","work both","work day","work environment","work environments","work ethic","work experience","work experience section","work force","work habits","work history","work hours","work life balance","work mosaic","work orders","work overtime","work place","work practices","work schedule","work schedules","work stations","work tasks","work weekends","workday","worked","worker","workers","workflow","workforce","working","workload","workplace","works","world","world class","world leader","world's","would","wouldn't","wv","www","www stvhs com careers asp careers","x","y","year","year college degree","year degree","year experience","year history today parent kpmg","years","years experience","years' experience","years hands","years sales experience","years work experience","yellow","yes","yet","york","york city","you","youd","you'll","young","younger","youngest","your","youre","you're","yours","yourself","yourselves","you've","yr","yrs","yrs experience","z","zero"];
}

function ContextReference(){
	this.context1 = ["including", "veteran", "gender", "other","strong","required","excellent","preferred","training","ensure","related","digital","provide","financial","engineering","senior","marketing","provides","using","high","public","offers","needs","private","professional","maintain","based","banking","develop","valid","providing","manage","full-time","current","please","working","planning","learning","various","competitive","proven","include","responsible","create","utilize","local","operating","meet","managing","eligible","full","social","supports","creates","make","basic","assigned","retail","prepare","annual","leading","developing","appropriate","proper","resume","drafting","processing","technical","wide","multiple","publishing","online","necessary","independent","educational","demonstrated","needed","pave","meets","more","great","diverse","urban","testing","total","physical","reconciling","clinical","regarding","helps","utilizing","monitoring","protect","selecting","additional","relevant","specific","optional","following","consulting","paid","electrical","applicable","rating","existing","perform","regional","bring","assists","launch","serves","serve","coordinating","prepares","lead","good","experienced","executes","performing","coordinate","logical","determine","performs","assess","evaluates","seasoned","effective","extensive","minimum","comprehensive","major","possess","facilitate","demonstrates","conducts","help","attends","ensures","satisfactory","increase","prep","exemplary","strategic","collaborates","managed","sophisticated","maintained","adapt","high-performing","achieve","adhere","stronger","establishes","oversees","update","better","produce","complex","unique","organized","monitor","operate","overseeing","maintains","implement","evaluate","making","structured","outstanding","established","supporting","savvy"];
	this.context2 = ["have","flexible","legal","corporate","such","national","reporting","variable","hedge","building","lower","academic","setting","instructional","human","understanding","conducting","stand","permanent","changing","attend","accounting","founded","small","certified","writing","makes","primary","educating","myriad","overall","controlled","international","individual","affect","participate","receive","proposed","commercial","involving","programming","unlimited","active","passionate","whole","stationary","uses","direct","completed","creative","define","simple","grow","editing","maintaining","print","popular","foreign","synthesizes","interactive","internal","offering","recording","registered","personal","green","budgetary","real","adequate","seeks","need","call","smart","started","organic","half-acre","efficient","sustainable","delivers","essential","looking","growing","advanced","allocate","formal","outdoor","assuming","involves","diagnostic","developmental","recommends","assist","accredited","handling","concerning","sterile","medical","build","informing","preparing","useful","intellectual","coding","billing","addressing","handle","recommended","written","beneficial","defined","involved","electronic","large","possible","separate","supplemental","desired","oriented","desirable","assume","external","relative","receivable","varied","handles","collecting","organizational","responsive","special","global","designed","teaching","teach","regulatory","tracking","reasoning","overcoming","spending","qualified","become","affecting","used","aligning","identified","statistical","superb","identifies","skilled","mandatory","acknowledge","developed","augment","created","outsourcing","served","avoid","prevents","interpreting","tracks","extraordinary","vulnerable","holds","inspect","supervising","require","demonstrate","repairing","install","develops","counsels","completes","arranges","participates","promotes","engage","underlying","resulting","pivotal","administering","demonstrating","entire","explain","employ","operates","mandated","transform","persuade","represents","directs"];
	this.context3 = ["payable","neuronal","verbal","harvesting","minor","printing","publishes","ready","seasonal","bound","keep","molecular","stocked","ping","federal","oral","feel","floral","opened","built","elementary","instruct","co-teaching","equal","respectful","substantial","chief","seeking","evolving","user-facing","take","grossed","want","functional","world-class","creating","winning","botanical","posted","inspiring","environmental","speak","reveals","farming","healthy","ordering","preventive","integrated","send","invited","threading","reliable","filling","speed","held","recurring","calculate","covered","protected","affirmative","customer-service","little","discretionary","received","neglected","updating","according","standard","come","unmet","reasonable","distribute","enter","dispensing","dating","represented","arbitrary","detained","select","recognized","generated","stringent","junior","relating","catering","free","enable","collaborate","enjoy","fundamental","automated","continuous","catered","analyzing","common","short","computational","natural","evolve","worldwide","remote","showering","hands-on","routing","skill","user-based","remediating","team-based","framing","troubleshooting","signaling","principal","biophysical","broader","born","finding","wrapped","detect","intimidated","able","scripting","primed","web-based","lasting","enough","electric","located","applied","generating","switching","applies","united","ensuring","displaced","male","temporary","favorable","described","uploaded","submit","verifying","submitted","first-year","mathematical","earned","looks","sell","nuclear","securing","enclosed","solid","came","potential","advertising","left","entrust","bigger","enrolled","establish","being","express","understands","focused","warning","burnished","resizing","designated","preparing","called","general","learns","write","approving","finished","join","fulfills","distributes","corresponding","departmental","keeps","freelance","edited","assisting","prospective","gaming","exciting","edits","attached","restocking","resetting","shelving","moving","registering","high-speed","literary","contemporary","traditional","speaking","maximize","transitioning","extracurricular","civic","contribute","adapted","note","in-house","seamless","visual","align","cross","innovative","shoot","headquartered","emotional","company-wide","wants","minimize","meeting","driven","indelible","ideal","individualized","struggling","ground-breaking","filled","propelling","protects","financing","seek","military","actual","issued","difficult","reviewing","literate","coaching","subsidized","scoring","challenging","open","swim","regular","learn","previous","aquatic","climbing","complete","continuing","live","talented","wanted","back-end","know","afraid","opening","strives","examining","administrative","noted","plays","municipal","posting","imposes","requires","emerging","doing","sole","re-training","holistic","speaks","knows","recognizes","dedicated","builds","solves","manages","beginning","spend","defining","face-to-face","vertical","low-income","cultural","instructing","offered","next","present","personalised","continues","normal","booking","calm","tested","enhancing","oversee","stated","follow","protective","low-cost","interested","cost-efficient","communal","consisting","organize","understand","fresh","representing","raising","raise","submitting","occasional","runs","different","enacts","combine","occurs","detailed","many","interpret","supervises","rental","allocated","numerous","reported","approve","manual","psychological","fulfill","qualifying","geographic","decentralized","comparable","housing","advises","ranging","allow","closes","impending","revocable","structural","industrial","political","permitted","broad-based","multi-state","empowers","charged","reduce","anticipate","divert","on-boarding","formatting","deleting","inserting","abandoned","saving","preserving","specified","healthier","routine","running","collect","execute","intermediate","spanning","capture","owned","assorted","invested","advise","enables","third-party","assumes","educate","structuring","thought","ranking","analytical","networking","analytic","enhance","inform","identifying","advising","executive-level"];
}

//*****START******START*******START****
//*****START******START*******START****
//*****START******START*******START****


var sibyl = function(text,options){ 
	var tagData = [];         	  					//raw array output from POS Tagger
	var rawTerms = [];        	  					//raw (all terms all POS) data in Term object form  
	var attributedTerms = [];		  				//terms (only nouns and noun combinations) with attributes
	var valuedTerms = [];			 				//terms (only nouns and noun combinations) with attributes and scores

	//DEFAULTS
	var opts={};
	opts.context=false;
	opts.sort=true;
	opts.glossary=true;
	opts.contextList=""; 
	opts.stopList="";

	if (options){
		if (options.hasOwnProperty(context)) opts.context=options.context;
		if (options.hasOwnProperty(sort)) opts.sort=options.sort;
		if (options.hasOwnProperty(sort)) opts.glossary=options.glossay;
		if (options.hasOwnProperty(contextList)) opts.contextList=options.contextList;
		if (options.hasOwnProperty(stopList)) opts.stopList=options.stopList;
	}

	//console.log('starting');

	//TAG AND BAG
	try{
		tagData = tagger(text);
	}
	catch (err) {
		return ([]);
	}
	
	//console.log('tagged');

	//CONVERT TO TERM OBJECT
	rawTerms = convertToObject(tagData);

	//console.log('converted');

	//PRIMARY FUNCTION FOR FILTERING AND RANKING
	attributedTerms = attributes(rawTerms);   							//returns two dimensional array
	
	//console.log('attributes');


	attributedTerms = multifrequency(attributedTerms); 					//get multi word term component frequency and other stuff that won't fit in the first loop
	
	//console.log('multi');


	//MODIFY VALUE BASED ON ATTRIBUTES
	valuedTerms = scored(attributedTerms);

	
	//OBTAIN CONTEXT (VERB & ADJECTIVE) LIST WITH FREQUENCY
	//if (opts.context) {
		valuedTerms = context(valuedTerms, rawTerms);
	//}
	
	//console.log('scored');

	//SORT ACCORDING TO RANK
	if (opts.sort) {
		valuedTerms = sort(valuedTerms);  						 		//sort results according to data ie tagdata[3][x] PL - does this do anything? Can I remove it?
	}

	if (opts.glossary) {
		for (var i in valuedTerms){
			valuedTerms[i] = {word:valuedTerms[i].word,count:valuedTerms[i].frequency,score:valuedTerms[i].score};
		}
	}
	return valuedTerms;  //SIBYL FINAL OUTPUT
}

//***CONVERTS POS TAGGER ARRAY OUTPUT TO TERM OBJECTS
function convertToObject(taggedList){
	var rawArray = [];
	for(var t = 0; t < taggedList.length; t++){
		rawArray[t] = new Term();
		rawArray[t].word = taggedList[t][0];
		rawArray[t].pos = taggedList[t][1];
	}
	return rawArray;
}

//***TOP LEVEL FUNCTION FOR VALUE FUNCTION
function scored(theArray){
	for(var t = 0; t < theArray.length; t++){
		theArray[t].value();
	}
	return theArray;
}

//***TAGGER FUNCTION****
function tagger(sometext){
	//console.log('>lex');
	var words = new Lexer().lex(sometext);
	//console.log('>tagger');     						//parse ("lex") the text so it can be processed
	var taggedWords = new pos.Tagger().tag(words);   					//POS tagger library tags lexed text
	return taggedWords;
}

function altTagger(text){

}

//****ATTRIBUTES FUNCTION
function attributes(rawArray){
	var theArray = [];
	var theWord = new Term();
	var lastWord = rawArray[0];
	var nextWord = new Term();
	var lastRecord = new Term();
	var dummy = new Term();
	var dupeBool = false;
	var count = 0;
	
	dummy.word = "XX";
	dummy.pos = "XX";
	rawArray.unshift(dummy); 						 								//dummy to front  -- add to the beggining to allow multiword	
	rawArray.push(dummy);		
	rawArray.push(dummy);				 			 								//to control multiword in loop

	//THE LOOP
	for (var i = 1; i <  (rawArray.length - 2); i++) {
		theWord = rawArray[i]; 														//load Term object from carried array
		//NOUN FILTER & other absolute filters
		if( (theWord.pos != "NNS") && (theWord.pos != "NNP") && (theWord.pos != "NN") ) continue;	
		if( (theWord.pos == "XX") || (isNumber(theWord.word == false)) ) continue;  //a couple more absolute filters
		if( (theWord.word.length < 2) || (theWord.word.length > 30) ) continue;  //a couple more absolute filters
		if( /[\.-\/#!$"”+\]“|;»()%\'^&\*:{}=\-_`~()â€]/.test(theWord.word)) continue; 
		theWord.word = theWord.word.replace(/\s/g,"");    							//remove white space
		lastRecord = rawArray[i - 1];												//for finding multi word terms
		nextWord = rawArray[i + 1];
	
		//PRIMARY FILTER FUNCTION
		theWord = filter(theWord, lastWord, nextWord, lastRecord);   				//Primary function - this mostly filters
		if( (theWord.acronym == false) && (theWord.word.length < 4)) continue;      //absolute filter for tiny words
		
		//APPLY STOP WORD LIST TO SINGLE WORD TERMS
		stopword(theWord);				
				
		//FIND MULTI WORD TERMS AND CLEANUP  
		theWord = multiword(theWord, lastWord, lastRecord, nextWord, theArray);     //*NOTE: stopword run against multi word terms in this function
		
		lastWord = theWord;  														//for the next loop iteration

		//FREQUENCY AND DEDUPE
		dupeBool = false;
		for(var k = 0; k < theArray.length; k++) if(theArray[k].word == theWord.word) dupeBool = k;  //see if its a dupe

		if(dupeBool != false){
			theArray[dupeBool].frequency++;
			continue;                                    		  					//break without recording if dupe
		}
		theArray.push(theWord);   													//load Term into array
	}

	return theArray;
}

//****FILTER FUNCTION****
function filter(theWord, lastWord, nextWord, lastRecord){   
	var wordlength = theWord.word.length;
	//NORMALIZE  & ADD VAL TO NN
	if(theWord.pos == "NNS"){
		if(theWord.word.substring(wordlength - 3, wordlength) == "ies"){
			theWord.word = theWord.word.slice(0, wordlength - 3) + "y";
		} else if(theWord.word.substring(wordlength - 2, wordlength) == "'s"){
			theWord.word = theWord.word.slice(0, wordlength - 2);
		} else if(theWord.word.substring(wordlength - 2, wordlength) == "’s"){
			theWord.word = theWord.word.slice(0, wordlength - 2);
		} else if(theWord.word.charAt(wordlength - 1) == "s"){
			theWord.word = theWord.word.slice(0, wordlength - 1);
		}
	} 
			
	//ADD VALUE FOR ACRONYMS AND INTERNAL CAPS
	if( (theWord.word == theWord.word.toUpperCase()) && (theWord.word.length < 7) && (theWord.word.length > 1) ){                //acronyms
		theWord.acronym = true;                                                  						    //add value to special acronym tracker
	} else if(theWord.word.substring(1, wordlength - 1) != theWord.word.substring(1, wordlength - 1).toLowerCase() ){     //internal caps
		theWord.midCapital = true;
		theWord.word = theWord.word.toLowerCase();
	} else if( (lastRecord.word == ",") && (nextWord.word == ",") ){            					 //comma seperated list
		theWord.commaSeparated = true;
		theWord.word = theWord.word.toLowerCase();
	} else if( (lastRecord.word == ".") && (theWord.word.substring(0,1) == theWord.word.substring(0,1).toUpperCase() ) ){    	     //start with cap but not begining of sentence
		theWord.frontCapital = true;
		theWord.word = theWord.word.toLowerCase();
	} else{theWord.word = theWord.word.toLowerCase(); }
	
	return theWord;
}


//***FIND MULTI WORD TERMS
function multiword(theWord, lastWord, lastRecord, nextWord){
	var nowpos = theWord.pos;                												     //primary word under evaluation Part Of Speach
	var lastpos = lastWord.pos;              										  			 //previouse word in text POS
	var nextpos = nextWord.pos;            											 		     //next word in text POS

	if( ((lastpos == "NN") || (lastpos == "NNS") || (lastpos == "NNP") ) && 				     //make sure the last word was a noun
		((theWord.word != "XX") && (lastWord.word != "XX")) &&
	   ((theWord.word != lastWord.word) && (lastRecord.pos == lastWord.pos)) && 				 //make sure they are next to each other
	   ((theWord.word.length > 2) && (lastRecord.word.length > 2)) &&     						 //nothing tiny, mostly just removes technical glitches
	   ((theWord.acronym == false) && (lastWord.acronym == false)) ){                            //no acronyms in multi word terms
		
		//allowed POS combinations for multi word terms
		if( ( (lastpos == "NNS")||(lastpos == "NNP")||(lastpos == "NN") ) && ( (nowpos == "NNS")||(nowpos == "NNP")||(nowpos == "NN") ) ){ 
			//DEFINE COMPONENTS AS SUBTERMS AND COMBINE/OVERWRITE INTO PRIMARY TERM
		    theWord.multiComponent1 = lastWord;   												  //this little guy needs a lot more analysis
		    theWord.multiComponent2 = theWord;
		    theWord.multiWordBool = true;  
			
		    theWord.word = theWord.multiComponent1.word + " " + theWord.multiComponent2.word;      //combine component word text
		    theWord.pos = theWord.multiComponent1.pos + " " + theWord.multiComponent2.pos;         //combine component pos tags
		    theWord.frequency = 1;															       //need to calculate this separately

		    stopword(theWord); 																	   //run new combined term against stopword lists
			stopword(theWord.multiComponent1);
			stopword(theWord.multiComponent2);
		}
	}  
	return theWord;
}

//DETERMINE FREQUENCY OF MULTI WORD TERM COMPONENTS
function multifrequency(theArray){
	for(var t = 0; t < theArray.length; t++){
		if(theArray[t].multiWordBool){								//check to make sure it is a multi word term
			for(var j = 0; j < theArray.length; j++){
				if(theArray[t].word == theArray[j].multiComponent1.word) theArray[j].multiComponent1.frequency = theArray[t].frequency;
				if(theArray[t].word == theArray[j].multiComponent2.word) theArray[j].multiComponent2.frequency = theArray[t].frequency;
			}
		}
	}
	return theArray;
}

//CHECK AGAINST THE STOP WORD LIST
function stopword(theWord){
	var reference = new StopReference();

	if(reference.stopword1.indexOf(theWord.word) != (-1)){
		theWord.stop1 = true;
		return true;
	} else if(reference.stopword2.indexOf(theWord.word) != (-1)){
		theWord.stop2 = true;
		return true;
	} else if(reference.stopword3.indexOf(theWord.word) != (-1)){
		theWord.stop3 = true;
		return true;
	} else { return false}
}


//****SORT FUNCTION****   *THIS IS AN INSERTION ARRAY - its not quite as fast as 'quick sort'
function sort(theArray){                                            		//contents of loop through tagged text
	var sortedArray = [];
	sortedArray[0] = theArray[0];  											//seed value
	for(var t = 1; t < theArray.length; t++){  								//loop through unsorted array of Terms
		for(var j = 0; j < sortedArray.length; j++){ 						//loop through sorted array of Terms
			if(theArray[t].score >= sortedArray[0].score){
				sortedArray.splice(0,0,theArray[t]);   						//for the beggining
				break;
			} else if (theArray[t].score <= sortedArray[sortedArray.length - 1].score){
				sortedArray.push(theArray[t]);							  	//for the end
				break;
			} else if( (theArray[t].score >= sortedArray[j + 1].score) && (theArray[t].score <= sortedArray[j].score)){
				sortedArray.splice( (j + 1) , 0, theArray[t]);				//insert into the sorted array
				break;
			}
		}
	}
	for(var k = 1; k < (sortedArray.length); k++) sortedArray[k].rank = k;
	return sortedArray;
}




//****CONTEXT FUNCTION****
function context(theArray, rawArray){	
	var contextList = [""];       						//LIST OF VERBS AND ADJECTIVES NEAR TERMS AND THEIR FREQUENCIES
	var contextListFrequency = [];
	var instanceTracker = [];
	var place;
	
	//LOAD PREGENERATED CONTEXT WORD LIST (verbs and adjectives that are frequently adjacent to high value terms)
	var contextReference = new ContextReference();

	//GENERATE LIST OF PREFERED CONTEXT FROM RAW TAGGED TEXT (prefered means surrounding top valued terms with frequency greater than 1)
	for(var w = 0; w < theArray.length; w++){  						//loop through top terms to generate most significant context word list
		if(theArray[w].score > 40){     							//**RIGHT NOW THE CUT-OFF IS BASED ON SCORE BECAUSE I DON'T ASSUME THE USE OF A SORT		
			for(var r = 0; r < rawArray.length; r++){
				if((theArray[w].word == rawArray[r].word) && (r != 0) && (r < rawArray.length) ){		
							if(((rawArray[r-1].pos == "VB") || (rawArray[r-1].pos == "VBP") || (rawArray[r-1].pos == "VBN") || (rawArray[r-1].pos == "VBD") || (rawArray[r-1].pos == "VBZ") || (rawArray[r-1].pos == "VBG") || (rawArray[r-1].pos == "JJ") || (rawArray[r-1].pos == "JJR")) && (rawArray[r-1].word.length > 3)){
								if(contextList.indexOf(rawArray[r-1].word) != (-1)){
									contextListFrequency[contextList.indexOf(rawArray[r-1].word)]++;
								} else {
									contextList.push(rawArray[r-1].word);
									contextListFrequency.push(1);
								}
							}
							
							if(((rawArray[r+1].pos == "VB") || (rawArray[r+1].pos == "VBP") || (rawArray[r+1].pos == "VBN") || (rawArray[r+1].pos == "VBD") || (rawArray[r+1].pos == "VBZ") || (rawArray[r+1].pos == "VBG") || (rawArray[r+1].pos == "JJ") || (rawArray[r+1].pos == "JJR")) && (rawArray[r+1].word.length > 3)){
								if(contextList.indexOf(rawArray[r+1].word) != (-1)){
									contextListFrequency[contextList.indexOf(rawArray[r+1].word)]++;
								} else {
									contextList.push(rawArray[r+1].word);
									contextListFrequency.push(1);
								}
							}			
				}
			}
		}
	}
	
	//LOOP THROUGH TERMS AND CHECK TO SEE IF HIGH VALUE CONTEXT WORDS ARE PRESENT
		for(var e in theArray.length ){  			
			for(var d in rawArray.length){
				if((theArray[e].word == rawArray[d].word) && (d != 0) && (d < rawArray.length-1) && d>rawArray.length+1 ){		
						if( (contextList.indexOf(rawArray[d-1].word) != (-1)) && (contextListFrequency[contextList.indexOf(rawArray[d-1].word)] > 1) ){
							theArray[e].contextLocal++;
							theArray[e].score = theArray[e].score + 3;
						}
						if( (contextList.indexOf(rawArray[d+1].word) != (-1)) && (contextListFrequency[contextList.indexOf(rawArray[d+1].word)] > 1) ){
							theArray[e].contextLocal++;
							theArray[e].score = theArray[e].score + 3;
						} 
						//pregenerated lists
						if((d != 0) && (d != rawArray.length)){
							if(((contextReference.context1.indexOf(rawArray[d-1].word) != (-1))||(contextReference.context1.indexOf(rawArray[d+1].word) != (-1)))){
								theArray[e].context1 = true;
								theArray[e].score = theArray[e].score + 3;
							} else if(((contextReference.context2.indexOf(rawArray[d-1].word) != (-1))||(contextReference.context2.indexOf(rawArray[d+1].word) != (-1)))){
								theArray[e].context2 = true;
								theArray[e].score = theArray[e].score + 2;
							} else if(((contextReference.context3.indexOf(rawArray[d-1].word) != (-1))||(contextReference.context3.indexOf(rawArray[d+1].word) != (-1)))){
								theArray[e].context3 = true;
								theArray[e].score = theArray[e].score + 1;
							}
						}
				}
			}
		}
	return theArray;
}


function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}


module.exports.extract = sibyl;


