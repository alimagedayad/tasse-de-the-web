require("dotenv").config();
const express = require('express')
const app = express()
const bodyParser = require("body-parser");
const mysql = require('mysql')
const {google} = require('googleapis');
const port = process.env.port || 8080
const connection = require("./db.js");
const token = process.env.REFRESH_TOKEN;
const client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uris = ["http://localhost:3000"];
// const config = require("./msal.config.js")

app.use(bodyParser.json());
// parse requests of content-type: application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));

const auth = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
    access_type='offline'
  );

auth.setCredentials({ refresh_token: token });
google.options({ auth });

const calendar = google.calendar({
    version: 'v3',
    project: 584661318077,
    auth: auth
});

let con; 

handleDiscount = () => {
  con = mysql.createPool(connection); 
  con.getConnection(error => {
    if(error) {
        console.log('Database connection error: ', error)
        setTimeout(handleDiscount, 2000)
        con.release();
    }
    else{
      console.log('Successfully connected to the database.')
    }
  })

  con.on('error', (err) => {
    console.log('db error: ', err)
    if(err.code === 'PROTOCOL_CONNECTION_LOST'){
      con.release();
      handleDiscount();
    }
    else{
      throw err; 
    }
  })
  return con; 
};

try{

    sqlExecute = (query, promiseResolve=false) => {
        return new Promise((resolve, reject) =>
        {
            sql.query(query, (err, resp) => {
                if (err) {
                    reject(err);
                } else {
                    if(promiseResolve){
                        resolve(resp)
                    }else {
                        resolve(true);
                    }
                }
            })
        }).catch((err) => {
            console.log(`sql catched: ${err}`)
        })
    }

    dateConstructor = (d,m,y,h,minute,s) => {
        const day = d;
        const month = m - 1;
        const year = y;
        const hour = h;
        const minutes = minute;
        const second = s;

        // console.log('d: ', d, " m: ", m, " y: ", y, " h: ", h, " minute: ", minutes, " second: ", s)

        return new Date(year,month,day,hour,minutes,second).toISOString();
    }

    responseSent = (status) => {
        if(status){
            return {
                'response': 'success',
                'code': 200,
                'body': null
            };
        }
        else{
            return{
                'response': 'error',
                'code': 400,
                'body': null
            };
        }
    }

    eventBuilder = (name, starty,startm,startd, starth, startminute, starts, endy,endm,endd, endh,endminute, ends, location="None", description="Generated by Tesse de the") => {

        const startDt = dateConstructor(startd, startm, starty, starth, startminute, starts);
        const endDt = dateConstructor(endd, endm, endy, endh, endminute, ends)
    
        return {
            'summary': name,
            'location': `${location}`,
            'description': `${description}`,
            'start': {
              'dateTime': `${startDt}`,
              'timeZone': 'Africa/Cairo'
            },
            'end': {
              'dateTime': `${endDt}`,
              'timeZone': 'Africa/Cairo'
            }
        };
    }

  let sql = handleDiscount(); 
  app.get('/tasks', (req,res) => {
    sql.query("SELECT * from tasks", (err, rows, fields) => {

        if(rows.length === 0){
            console.log('No data found!')
        }
        else
        {
            res.json({data: rows})
        }
    })

    sql.release(); 
})

// app.get('/calendar/tasks', (req,res) => {
//     calendar.events.list({
//         calendarId: 'tesse-de-tea@outlook.com',
//         timeMin: (new Date()).toISOString(),
//         maxResults: 10,
//         singleEvents: true,
//         orderBy: 'startTime',
//       }, (error, result) => {
//         if (error) {
//           res.send(JSON.stringify({ error: error }));
//         } else {
//           if (result.data.items.length) {
//             res.send(JSON.stringify({ events: result.data.items }));
//           } else {
//             res.send(JSON.stringify({ message: 'No upcoming events found.' }));
//           }
//         }
//       });    
// })

app.get('/calendar/tasks', (req,res) => {
    calendar.events.list({
      calendarId: 'tesse-de-tea@outlook.com',
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: 'startTime',
    }, (error, result) => {
      if (error) {
        res.send(JSON.stringify({ error: error }));
      } else {
        if (result.data.items.length) {
          res.send(JSON.stringify({ events: result.data.items }));
        } else {
          res.send(JSON.stringify({ message: 'No upcoming events found.' }));
        }
      }
    });    
});

addCalendarEvent = (event) => {
    return new Promise((resolve, reject) => {
        calendar.events.insert({
            calendarId: 'primary',
            resource: JSON.parse(JSON.stringify(event))
        }, (err, resp) => {
            if(err){
                reject(err);
            } else {
                if (resp.status === 200 && resp.statusText === 'OK') {
                    resolve(resp.data.id);
                }
            }
        })
    }).catch((err) => {
        console.log(`addCalendarEvent catched: ${err}`)
    })
}

emptyCalendar = (calendarID) => {
    return new Promise((resolve, reject) => {
        calendar.events.clear({
            calendarId: calendarID
        }, (err, resp) => {
            if(err){
                reject(err);
            } else {
                console.log(`emptyCalendar: ${resp}`)
                if (resp.status === 200 && resp.statusText === 'OK') {
                    resolve(true);
                }
            }
        })
    }).catch((err) => {
        console.error(`emptyCalendar: ${err}`)
    })
}

removeCalendarEvent = (eventID) => {
    return new Promise((resolve, reject) => {
        calendar.events.delete({
            calendarId: 'primary',
            eventId: eventID
        }, (err, resp) => {
            if(err){
                reject(err);
            } else {
                if (resp.status === 204) {
                    resolve(true);
                }
            }
        })
    }).catch((err) => {
        console.log(`removeCalendarEvent catched: ${err}`)
    })
}

app.post('/calendar/event/add', (req, res) => {
    const name = req.body.name;
    const starty = req.body.startyear;
    const startm = req.body.startmonth;
    const startd = req.body.startday;
    const starth = req.body.starthour;
    const startminute = req.body.startminute;
    const starts = req.body.startsecond;
    const endy = req.body.endyear;
    const endm = req.body.endmonth;
    const endd = req.body.endday;
    const endh = req.body.endhour;
    const endminute = req.body.endminute; 
    const ends = req.body.endsecond; 
    const event = eventBuilder(name,starty,startm,startd, starth, startminute, starts, endy,endm,endd, endh,endminute, ends);
    
    calendar.events.insert({        
        'calendarId': 'primary',
        'resource': JSON.parse(JSON.stringify(event))
    }, (err, resp) => {

        // console.log('response: ', res)
        console.log('resp: ', resp)

        if (err) {
            res.json({error: err});
          } else {
            if(resp.status == 200 && resp.statusText == 'OK'){
                res.json({"message": "success", "eID": resp.data.id})
            }
          }
    })
})



app.put('/calendar/event/update', (req, res) => {
    const name = req.body.name;
    const eventID = req.body.eID;
    const starty = req.body.startyear;
    const startm = req.body.startmonth;
    const startd = req.body.startday;
    const starth = req.body.starthour;
    const startminute = req.body.startminute;
    const starts = req.body.startsecond;
    const endy = req.body.endyear;
    const endm = req.body.endmonth;
    const endd = req.body.endday;
    const endh = req.body.endhour;
    const endminute = req.body.endminute; 
    const ends = req.body.endsecond; 
    const event = eventBuilder(name,starty,startm,startd, starth, startminute, starts, endy,endm,endd, endh,endminute, ends);
    
    calendar.events.update({        
        'calendarId': 'primary',
        'eventId': eventID,
        'resource': JSON.parse(JSON.stringify(event))
    }, (err, resp) => {
        if (err) {
            res.json({error: err});
          } else {
            if(resp.status == 200 && resp.statusText == 'OK'){
                // res.json({"response": resp})
                res.json({"message": "success", "eID": resp.data.id})
                // res.json({"message": "success"})
            }
          }
    })
})

app.post('/task/add', async(req, res) => {
    const reqBody = JSON.stringify(req.body);
    const request = JSON.parse(reqBody)
    let reqStatus = null;
    for (const task of request) {
        const taskContent = task.content;
        const taskID = task.tid;
        const taskPriority = task.taskPriority;
        const category = task.category;
        const taskDay = task.taskDay;
        const taskMonth = task.taskMonth;
        const taskYear = task.taskYear;
        const taskHour = task.taskHour;
        const taskMinute = task.taskMinute;
        const taskSecond = task.taskSecond;
        const timestamp = Date.now();
        const checked = task.taskChecked;
        const event = eventBuilder(taskContent, taskYear, taskMonth, taskDay, taskHour, taskMinute, taskSecond, taskYear, taskMonth, taskDay, taskHour, taskMinute, taskSecond);
        const eventID = await addCalendarEvent(event)
        const query = `INSERT INTO tasks(task, category, timestamp, taskDay, taskMonth, taskYear, taskHour, taskMinute, taskSecond, tID, priority,taskChecked, eID)  
        VALUES ('${taskContent}', '${category}', '${timestamp}', '${taskDay}', '${taskMonth}', '${taskYear}', '${taskHour}', '${taskMinute}', '${taskSecond}'
        , '${taskID}', '${taskPriority}', '${checked}', '${eventID}');`;
        const sqlRes = await sqlExecute(query);
        if(sqlRes){
            console.log('done!')
            reqStatus = true;
        }
        else{
            reqStatus = false;
        }
    }
    res.json(responseSent(reqStatus))
})

app.post('/tasks/delete', async(req,res) => {
    let valid = true;
    let query = "SELECT (eID) FROM `tasks`;"
    let sqlRes = await sqlExecute(query, true);
    for (const task of sqlRes) {
        const eventID = task.eID;
        const apiResponse = await removeCalendarEvent(eventID)
        if(!apiResponse){
            valid = false;
        }
    }
    query = 'TRUNCATE `tasks`;'
    sqlRes = await sqlExecute(query)
    if(sqlRes){
        reqStatus = true;
    }
    else{
        reqStatus = false;
    }

    res.json(responseSent(reqStatus))
})

app.get('/tasks/fetch', async(req, res) => {
    let valid = true;
    const query = "SELECT (eID) FROM `tasks`;"
    const sqlRes = await sqlExecute(query, true);

    for (const task of sqlRes) {
        console.log(`task: ${task.eID}`)
        const eventID = task.eID;
        const apiResponse = await removeCalendarEvent(eventID)
        if(!apiResponse){
            valid = false;
        }
    }

    res.json(responseSent(valid))
})

app.get('/tasks/all', (req, res) => {
    let response = [];
    sql.query("SELECT * from `tasks`;", (err, result) => {
         if (err) {
             console.log('Select query error: ', err);
         } else {
             Object.keys(result).forEach((key) => {
                 const row = result[key];
                 const tID = row.id;
                 const task = row.task;
                 const category = row.category;
                 const checked = row.taskChecked;
                 const timestamp = row.timestamp;
                 const taskDay = row.taskDay;
                 const taskMonth = row.taskMonth;
                 const taskYear = row.taskYear;
                 const taskHour = row.taskHour;
                 const taskMinute = row.taskMinute;
                 const taskSecond = row.taskSecond;
                 const taskID = row.tID;
                 const priority = row.priority;
                  console.log('Checked: ',checked);
                 response.push({
                     "id": tID,
                     "tID": taskID,
                     "task": task,
                     "category": category,
                     "priority": priority,
                     "taskDay": taskDay,
                     "taskMonth": taskMonth,
                     "taskYear": taskYear,
                     "taskHour": taskHour,
                     "taskMinute": taskMinute,
                     "taskSecond": taskSecond,
                     "timestamp": timestamp,
                     "taskChecked": checked
                 })
             })
             res.json(JSON.parse(JSON.stringify(response)))
         }

     })
});

app.get('/', (req,res) => {
    res.json({message: "Welcome!"})
})

app.listen(port, () => {
    console.log("Server is running on port " + port + ".");
});
}   
catch(err){
  console.log('Index Error: ', err)
}