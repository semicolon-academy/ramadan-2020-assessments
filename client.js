// Template instructions object. The property key, is the variable {{name}} in the template
// and the value is the response key name.
var tpl_inst = {
    title: 'topic_title',
    details: 'topic_details',
    expected: 'expected_result',
    state: 'status, boldItalic',
    name: 'author_name',
    email: 'author_email',
    dated: 'submit_date, formatDate',
    level: 'target_level, boldItalic',
    voteUpEndPoint: '_id, voteUpLink',
    voteDownEndPoint: '_id, voteDownLink',
    count: 'votes, extractVote',
    id: '_id'
}
var sort = false;
var sortDir = 'DES'
var listOfRequests = document.getElementById('listOfRequests');

function formatDate(dt){
    date =  new Date(dt)
    return date.toLocaleDateString() + '@' + date.getUTCHours() + ':' + date.getMinutes()
}
function boldItalic(txt){
    return '<b><i>'+txt+'</i></b>'
}

function voteUpLink(id){
    return 'http://localhost:7777/video-request/vote?vote_type=ups&id='+id
}

function voteDownLink(id){
    return 'http://localhost:7777/video-request/vote?vote_type=downs&id='+id
}

function extractVote(voteOb){
    return voteOb.ups - voteOb.downs
}

/**
 * 
 * @param {String} tpl The HTML of the template with its variable in the form {{varName}}
 * @param {Object} tpl_inst The template instructions or mapping that maps each template variable as a key to its expected response key name
 * @param {Object} res The response data object that obeyes the instructions in tpl_inst
 * @returns {String} The rendered HTML template with its variables values.
 */
function render_tpl(tpl, tpl_inst, res) {
    var output = tpl // From /template.js
    let value = '';
    output = extractSubTpls(output,tpl_inst,res)
    Object.keys(tpl_inst).forEach((k) => {
        let filters = tpl_inst[k].split(',');
        if (filters.length > 1){
            tpl_inst[k] = tpl_inst[k].trim(filters[0])            
            value = window[filters[1].trim()](res[filters[0].trim()]);
            
        }
        else{
            value = res[tpl_inst[k]]
        }        
        var replace = "{{" + k + "}}";
        var re = new RegExp(replace, "g");        
        output = output.replace(re, value)
    })
    return output
}

// sub templates process functions

/**
 * 
 * @param {*} tpl 
 * @param {*} tpl_inst 
 * @param {*} reGex 
 * @param {*} data 
 * @param {*} tplName 
 * @param {*} v 
 */

function pNotEmpty(tpl,tpl_inst,reGex,data,tplName,v){
    if (data[tpl_inst[v]] != ''){
        //console.log('GGGG',data[tpl_inst[tplName]])
        return tpl.replace(reGex,window[tplName])        
    }
    return tpl.replace(reGex,'')

}

function extractSubTpls(tpl,tpl_inst,data){
    var output = ''
    var rep = '\{\{TPL,.*\}\}';
    var rgx = new RegExp(rep,"g")
    subTpls = tpl.match(rgx);
    for (i=0; i< subTpls.length; i++){
        params = subTpls[i].replace(/\{\{|\}\}/g,'').split(',');
        console.log(params[3])
        switch(params[3]){
            case 'notEmpty':
                output += pNotEmpty(tpl,tpl_inst,rgx,data,params[1],params[2]);
                break;
            default:
                return tpl.replace(rgx,window[params[1]])
        } 
        
        
       // console.log(params,data,data[tpl_inst[params[2]]])
    }
    return output;
}

/**
 * After XHR success, it insterts each response item to the listOfRequests videos.
 */

function loadVideos() {    
    if (readVideos.readyState === XMLHttpRequest.DONE) {
        if (readVideos.status === 200) {
            var response = JSON.parse(readVideos.responseText);   
            //console.log(response)
            var voteWeights = [];         
            for (var res of response) {
                
                arr = [calculateVote(res.votes.ups,res.votes.downs)] 
                //arr.push(render_tpl(tpl, tpl_inst, res))
                arr.push(render_tpl(tpl, tpl_inst, res))
                voteWeights.push(arr)
                console.log(calculateVote(res.votes.ups,res.votes.downs))        
               // listOfRequests.insertAdjacentHTML('beforeend', render_tpl(tpl, tpl_inst, res));                
            }
            if (sort){
                if (sortDir == 'DES'){
                    voteWeights.sort((a,b) => b[0] - a[0])
                }
                else{
                    voteWeights.sort((a,b) => a[0] - b[0])
                }
                
                voteWeights.forEach((i) => listOfRequests.insertAdjacentHTML('beforeend',i[1]))
            }
            else{
                voteWeights.forEach((i) => listOfRequests.insertAdjacentHTML('beforeend',i[1]))
            }
        } else {
            alert('There was a problem with loading videos list!');
        }
        console.log(voteWeights)
        console.log(voteWeights.sort((a,b) => b[0] - a[0]))

        votesHandle('vote')
        
    }
}

function sortVids(container,dir,def){
    if (def){
        sort = false;       
    }
    cont = document.getElementById(container);
    cont.innerHTML = '';
    if (!sort && !def){
        sort = true;
    }
    sortDir = dir;
    loadVideos()
}

function checkSaving() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
        if (xhr.status === 200) {
            var response = JSON.parse(xhr.responseText);
            alert('New video request has been created with an ID:\n' + response._id);
            formElements = createForm.elements
            for (i = 0; i < formElements.length; i++) {
                formElements[i].value = '';
            }  
            listOfRequests.insertAdjacentHTML('afterbegin', render_tpl(tpl, tpl_inst, response));
            votesHandle('vote')
        } else {
            alert('There was a problem with the request.');
        }
    }
}

/**
 * 
 * @param {String} className the class name of voting link
 */
function votesHandle(className){
    const voteLinks = document.getElementsByClassName(className);    
    for (var el of voteLinks){        
        el.addEventListener('click', (e)=> {
            e.preventDefault(); 
            if (!confirm("Are you sure about voting on:\n"+e.target.parentNode.parentNode.querySelector('h3').innerText)) return false;          
            var putData = createVoteBody(e.target)
            url = el.origin+el.pathname
            putVote(putData,url, e.target)  
            e.target.blur();          
        })
    }    
}

function createVoteBody(el){
    return el.search.split('?')[1];
}

function updateVoteCounter(){
    if (vxhr.readyState === XMLHttpRequest.DONE) {
        if (vxhr.status === 200) {
            var response = JSON.parse(vxhr.responseText); 
                 var votes = response.votes;  
                 //console.log(votes,response, vxhr) 
                 var counter = document.getElementById(response._id)       
                 counter.innerText = calculateVote(votes.ups, votes.downs)+ ((createVoteBody(vxhr.el).indexOf('=ups') > -1)? 1 : -1);                
        } else {
            alert('There was a problem with loading votes!');
        }      
        
    }

}

function calculateVote(ups,downs){
    return ups-downs
}

function putVote(data,url, el){

    vxhr = new XMLHttpRequest();
    vxhr.el = el;
    vxhr.onreadystatechange = updateVoteCounter;
    
    vxhr.open("PUT", url, true);
    vxhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    vxhr.send(data);

}
document.addEventListener('DOMContentLoaded', function () {
    // Getting Videos list.
    readVideos = new XMLHttpRequest();
    readVideos.onreadystatechange = loadVideos;
    readVideos.open("GET", 'http://localhost:7777/video-request', true);    
    readVideos.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    readVideos.send('top=3');
    //
    // Handling the form, preparing the form's data and submitting the form via XHR
    const createForm = document.getElementById('createForm');
    createForm.addEventListener('submit', (e) => {        
        e.preventDefault()
        xhr = new XMLHttpRequest();
        xhr.onreadystatechange = checkSaving;
        xhr.open("POST", "http://localhost:7777/video-request", true);
        xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
        data = new FormData(createForm);
        postData = ''
        for (i of data.entries()) {
            postData += i[0] + '=' + i[1] + '&'
        }        
        xhr.send(postData)
    });
    // 
    // Handle votes
    // Could not be done here.   
});


