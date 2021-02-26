/* Magic Mirror Module
 * By: Andrew Matayka
 * Module: MMM-ClickUPv2
 * Version: 0.01
 */

const NodeHelper = require("node_helper");
const request = require("request");

module.exports = NodeHelper.create({
    //Ran on the start of the node helper
    start: function () {
        console.log("MMM-ClickUPv2: Node Helper Started");
    },

    //Ran when receiving notification from the module
    socketNotificationReceived: function (notification, payload) {
        if (notification === "Request_AccessToken") {
            console.log("MMM-ClickUPv2: Request Access Token Notification Received");

            this.config = payload;
            this.requestAccessToken();
        }
    },

    requestAccessToken: function () {
        var self = this;

        request({
            url: "https://api.clickup.com/api/v2/oauth/token",
            method: "POST",
            headers: {
                "content-type": "application/json",
                "cache-control": "no-cache"
            },
            form: {
                client_id: self.config.clientID,
                client_secret: self.config.clientSecret,
                code: self.config.accessCode
            }
        },
            function (error, response, body) {
                if (error) {
                    self.sendSocketNotification("Error", {
                        error: error
                    });
                    return console.error("MMM-ClickUPv2: " + error);
                }
                //if(this.config.debug){
                //	console.log(body);
                //}
                if (response.statusCode === 200) {
                    //var responseJson = JSON.parse(body);
                    //accessToken = responseJson.access_token;
                    console.log("Access Token: " + accessToken);

                    //fs.writeFile('accessToken.txt', accessToken, function (err) {
                    //    if (err) return console.log(err);
                    //    console.log(accessToken + ' > accessToken.txt');
                    //});
                } else {
                    console.log("ClickUP api request status=" + response.statusCode);
                    console.log("RESPONSE: " + response.body);

                    self.sendSocketNotification("Error", {
                        error: response.body,
                        statusCode: response.statusCode
                    });
                }

            });
    },
});