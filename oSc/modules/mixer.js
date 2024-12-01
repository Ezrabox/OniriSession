module.exports = {

    init: function(){
        // this will be executed once when the osc server starts
    },

    oscInFilter:function(data){
        var {address, args, host, port} = data

        var baseAdd = "(/nodes/.+)";

        var regex =baseAdd+"/(in[0-9]+)/index";
        var result = address.match(regex);

        if(result != null)
        {
            receive(result[1], {"type":"s","value":result[2]}, {"type":"f","value":args[0].value});
        }
       

        return {address, args, host, port}

    },

    oscOutFilter:function(data){
        var {address, args, host, port, clientId} = data
        return {address, args, host, port}
    },

    unload: function(){
        // this will be executed when the custom module is reloaded
    },

}