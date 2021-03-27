# MMM-ClickUPv2
This is an extension for the [MagicMirror](https://github.com/MichMich/MagicMirror).
It can display your tasks from your ClickUP Todo List.
You can add multiple instances of this module with different lists selected.
Only one account supported.
The requests to the server will be paused if this module is not displayed currently on the Mirror (either because of the use of carousel or hidden by Remote-Control for example) or by the use of a PIR sensor and the module MMM-PIR-Sensor.
An immediate update will occur once the module returns to the display.

## Installation
1. Navigate into your MagicMirror's `modules` folder and execute the command `git clone https://github.com/AndrewMatayka/MMM-ClickUPv2.git`.
A new folder will appear, navigate into it.
2. Execute the command `npm install` in order to install the required node dependencies.

## Using the Module
In order to use this module, you must add it to the modules array in the `config/config.js` file.

For Example:
````javascript
modules: [
    {
        module: 'MMM-ClickUPv2',
        position: 'middle_center', //This can be any of the regions. Best results in left or right regions.
        header: 'ClickUP', //This is optional
        config: {
            folderName: "Education", //The name of the Folder that your List is in.
            listName: "Homework", //The name of the List that you want to get Tasks from.
            updateInterval: 60 * 1000, //How often the Module will update (Min * Sec * MS) 60 Seconds
            taskTypes: ["Class", "Type"], //The names of the Custom Fields (Types) that you want to be shown.
            completedStatus: "submitted", //The name of your completed Status. Used to cross off or remove already completed Tasks.
            maxCompletedTaskCount: 3, //The maximum number of completed Tasks to show on screen crossed off.
            dontShowUntilStartDate: true, //If this is true, it will hide any tasks until their start date. If false will show all tasks as normal
            includeTextInStatusIndicatorCell: true,
            showSubmittedSubtasks: false,
            clientID: "CZ2CGOL98DNVSMP4O4T3YN26L7E4E4VR", //Your Client-ID That you get when registering an app.
            clientSecret: "2YFBQZPOZ47OZGEAORT8LYFHX6ICILIJD8CIPZFBMMIY8O48QL29ZDAJ6REN4E12", //Your Client-Secret that you get when registering an app.
            accessCode: "40R1Z3TX3EYQ9HW1VSZBMM1EMX3MJNH2", //The accessCode that we got from the guide. Using [MMM-ClickUPv2-Server]
            debug: false //Whether or not to show Debug info.
        }
    }
]
````

## Configuration Options
The following properties are able to be configured inside of `config/config.js`.
