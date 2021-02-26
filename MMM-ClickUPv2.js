/* Magic Mirror Module
 * By: Andrew Matayka
 * Module: MMM-ClickUPv2
 * Version: 0.01
 */

Module.register("MMM-ClickUPv2", {
    //Default Config Values
    defaults: {
        updateInterval: 1 * 1 * 1000, //How often module is updated: (Min * Sec * Ms) = Every 60 Seconds

        clientID: "CZ2CGOL98DNVSMP4O4T3YN26L7E4E4VR",
        clientSecret: "2YFBQZPOZ47OZGEAORT8LYFHX6ICILIJD8CIPZFBMMIY8O48QL29ZDAJ6REN4E12",
        accessCode: "C22YB0MRTDM6R1M80DCNI4JNRDRFLUEN",

        accessToken: "", //Access Token required for authorization of API
    },

    //Gets the styles for the module
    getStyles: function () {
        return [
            this.file('MMM-ClickUPv2.css')
        ]
    },

    //The header displayed above the Module - Can be configured by User
    getHeader: function () {
        if (this.data.header === undefined) {
            return 'ClickUP';
        } else {
            return this.data.header;
        }
    },

    //Ran at start of module
    start: function () {
        Log.trace("Getting Styles: " + this.getStyles(), this);
        Log.trace("Starting Module", this);
        var self = this; //Set variable self to this object

        //Need to check if we already have Access Token. If not we need to acquire it.
        if (this.config.accessToken !== null && this.config.accessToken !== undefined && this.config.accessToken !== "") {
            //We have Access Token
            Log.trace("Found Access Token: " + this.config.accessToken, this)
        } else {
            //Send request to get Access Token

            Log.trace("Requesting Access Token", this)
            this.sendSocketNotification('Request_AccessToken', this.config); //Request Access Token from Node Helper
        }

        setInterval(function () {
            self.updateDom(); // no speed defined, so it updates instantly. Updates the Dom of the page
        }, this.config.updateInterval); //perform every update interval 
    },

    //Ran on suspension of module
    suspend: function () {

    },

    //Ran on resume of module
    resume: function () {

    },

    //Ran when receiving notification from System or other Modules
    notificationReceived: function (notification, payload, sender) {

    },

    //Ran when receiving notification from Node Helper
    socketNotificationReceived: function (notification, payload) {
        if (notification === "AccessToken") {
            Log.trace("Received Access Token: " + payload, this);
        } else if (notification === "Error") {
            Log.error("Received Error: " + JSON.parse(payload.error).err, this)
            alert("Error: " + JSON.parse(payload.error).err);
        }
    },

    //Ran when updating HTML of Module
    getDom: function () {
        var wrapper = document.createElement('div');

        Log.trace("GetDom Called", this);
        wrapper.innerHTML = "Loading...";

        return wrapper;
    }
});

//NEW LOG FUNCTION
var Log = {
    info: function (message) {
        console.log("%cInfo: " + message + "\n", "color: gray");
    },

    trace: function (message, that) {
        console.log("%c" + that.name + ": " + message, "color: cyan");
    },

    log: function (message) {
        console.log(message);
    },

    error: function (message) {
        console.log("%cError: " + message, "color: red");
    },

    error: function (message, that) {
        console.log("%c" + that.name + " - Error: " + message, "color: red");
    }
}