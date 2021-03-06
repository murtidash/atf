if(!(typeof JSON === 'object' && typeof JSON.stringify === 'function')) {
      $.getScript('//cdnjs.cloudflare.com/ajax/libs/json2/20121008/json2.min.js', winHasJSON);
    }

 function findFlavor(flavor,callback) {
      //put flavor text in
      $("#name_like").val(flavor.mfg + " " + flavor.name);
      //then update the form
      $("#name_like").addClass("loading"); // show the spinner
      var form = $("#flavors-search-form"); // grab the form wrapping the search bar.
      var url = "/flavors/live_search"; // live_search action.
      var formData = form.serialize(); // grab the data in the form
      $.get(url, formData, function(html) { // perform an AJAX get
        $("#name_like").removeClass("loading"); // hide the spinner
        $("#flavors-results").html(html); // replace the "results" div with the results      
      });
      //Let's see if we found a match
      setTimeout(function() {
        var len = $("#flavors-results tr").length;
        console.log("Found " + len + " results for flavor " + JSON.stringify(flavor));
        if (len == 0) {
          //Only let it recurse once
          console.log("recurse: " + flavor.recurse);
          if((flavor.recurse==undefined || isNaN(flavor.recurse))) {
            flavor.recurse=0;
          }
          if(len == 0 && (flavor.recurse < 3 && flavor.name != "")) {
            var lastIndex = flavor.name.lastIndexOf(" ");
            flavor.name = flavor.name.substring(0, lastIndex);
            $("#name_like").val(flavor.mfg + " " + flavor.name);
            console.log("in recurse");
            flavor.recurse++;
            findFlavor(flavor);            
          }
        }
        else {
          console.log("results found, picking first one");
          addflavor(flavor)
        };        
      },1000)
      if(callback) callback();
};

function addflavor(flavor){
  console.log("in addflavor for " + JSON.stringify(flavor));
  $("#user_flavor_volume").val(flavor.quantity);
  $("#user_flavor_cost").val(flavor.price);
  $(".glyphicon-chevron-right").click();
  setTimeout(function(){
    flavor.quantity = Number(flavor.quantity[0].match(/\d*/)[0]);
    var origFlavor = $("#user_flavor_volume").val();
    console.log("origFlavor = "+origFlavor + "quantity = "+flavor.quantity);
    var totalflavor = Number(origFlavor)+Number(flavor.quantity);
    flavor.price = flavor.price.match(/\$(.*)/)[1];
    console.log("price is : " + flavor.price);
    $("#user_flavor_stashed").prop( "checked","checked");
    $("#user_flavor_volume").val(totalflavor);
    $("#user_flavor_cost").val(flavor.price);
    var priceperml = Number((flavor.price/flavor.quantity*100/100)).toFixed(2);
    console.log(priceperml);
    //Remove this line for testing purposes to not submit to ATF
    $(".panel-footer > .btn").click();
    console.log("had " + origFlavor + " added " + flavor.quantity + " for a total of "+ totalflavor);
  },2000);
}

function removeflavor(flavor){
  console.log("in addflavor for " + JSON.stringify(flavor));
  $("#user_flavor_volume").val(flavor.quantity);
  $("#user_flavor_cost").val(flavor.price);
  $(".glyphicon-chevron-right").click();
  setTimeout(function(){
    $("#user_flavor_stashed").prop( "checked",false);
    $("#user_flavor_volume").val(0);
    $("#user_flavor_cost").val(0);
    $("#user_flavor_cost_per_ml").val(0);

    $(".panel-footer > .btn").click();
    console.log("had " + origFlavor + " added " + flavor.quantity + " for a total of "+ totalflavor);
  },2000);
}

var flavorlist = [];
// Inform the background page that
// this tab should have a page-action
chrome.runtime.sendMessage({
  from:    'content',
  subject: 'showPageAction'
});

// Listen for messages from the popup
console.log("start of content.js");
chrome.runtime.onMessage.addListener(function (msg, sender, response) {
  // First, validate the message's structure
  if ((msg.from === 'popup') && (msg.subject === 'DOMInfo')) {
    // Collect the necessary data 
    // (For your specific requirements `document.querySelectorAll(...)`
    //  should be equivalent to jquery's `$(...)`)
    var domInfo = {
      total:   document.querySelectorAll('*').length,
      inputs:  document.querySelectorAll('input').length,
      buttons: document.querySelectorAll('button').length
    };
    response(domInfo);
  }

  if ((msg.from === 'popup') && (msg.subject === 'pushFlavors')) {
    // Collect the necessary data 
    // (For your specific requirements `document.querySelectorAll(...)`
    //  should be equivalent to jquery's `$(...)`)
    var jsonFlavors = eval('(' + msg.data + ')');
    console.log("in pushflavors " + jsonFlavors + " has " + jsonFlavors.length + " flavors");
    $.each(jsonFlavors, function(index,flavor) {
      setTimeout(function(){
        console.log(flavor);        
        findFlavor(flavor,function() {})
      },index*6000);
    });
    response("hi"+jsonFlavors);
    }
  

  if ((msg.from === 'popup') && (msg.subject === 'getFlavorsbcv')) {
    // Collect the necessary data
    var flavorlist = [];
    console.log("in bcv cart message");
    cart = $('.CartContents:first > tbody > tr');
    cart.each( 
      function(index, row) {
        //Get the flavor info
        var fullString = ($(this).find("a").text()).split("-");
        var price = $(this).find(".ProductPrice").text();
        var quantity = ($(this).find(".OrderItemOptions").text()).match(/\d*ml/);
        console.log("quantity:"+quantity);
        var flavor=fullString[0];
        var mfg=fullString[1];
        if(mfg=='TFA') {
          mfg='TPA';
        }        
        console.log("name:"+flavor+" mfg:"+mfg + " price:"+price+" quantity:"+quantity);
        if(quantity!==null) {
          flavorlist.push({name:flavor,mfg:mfg,price:price,quantity:quantity});
        }
      });
    //Turn it into json
    var json_data = JSON.stringify(flavorlist);
    console.log(json_data);
    // Directly respond to the sender (popup), 
    // through the specified callback */
    response(json_data);
    }

    if ((msg.from === 'popup') && (msg.subject === 'getFlavorsece')) {
    console.log("in ece cart message");
    // Collect the necessary data
    var flavorlist = [];
    cart = $('#my-orders-table > tbody');
    //console.log(cart);
    cart.each( 
      function(index, row) {
        console.log(row);
        //Get the flavor info
        var fullString = ($(this).find(".product-name").text()).toLowerCase().split(" by ");
        console.log(fullString);
        var flavor=fullString[0].replace(/[{()}]/g,'');
        var mfg=fullString[1];
        switch(mfg) {
          case "flavourart":
            mfg="fa";
            break;
          case "flavor west":
            mfg="fw";
            break;
          case "lorann flavoring":
            mfg="la";
            break;
          case "flavors express":
            mfg="fe";
            break;
          case "signature (tfa)":
            mfg="tpa";
            break;
          case "jungle flavors":
            mfg="jf";
            break;
          case "inawera":
            mfg="inw";
            break;
          case "capella flavor drops":
            mfg="cap";
            break;
          case "flavorah":
            mfg="flv";
            break;
          default:
            break;
        }
        if(mfg == null) {
          return false;
        }
        if(mfg.match(/(inawera).*(\d*)ml/)){
          quantity = mfg.match(/(inawera)\s*(\d*ml)/)[2];
          mfg = "inw";
          if(flavor == "grapes") {flavor="grape"};
        }
        else {
          var quantity = ($(this).find(".item-options").text()).toLowerCase().match(/\d*ml/);
        }
        console.log("quantity : " + quantity);        
        console.log("flavor : " + flavor + " mfg : " + mfg);
        var price = $(this).find(".price:first").text();
        console.log("name:"+flavor+" mfg:"+mfg + " price:"+price+" quantity:"+quantity);
        if(quantity!==null) {
          flavorlist.push({name:flavor,mfg:mfg,price:price,quantity:quantity});
         }
      });
    //Turn it into json
    var json_data = JSON.stringify(flavorlist);
    console.log(json_data);
    // Directly respond to the sender (popup), 
    // through the specified callback */
    response(json_data);
    }
   
    
});