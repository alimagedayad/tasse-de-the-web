const path = require('path')
const express = require('express')
const app = express()
const bodyParser = require("body-parser");
const mysql = require('mysql')
const port = process.env.port || 3000
const connection = require("./db.js");

app.use(bodyParser.json());
// parse requests of content-type: application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true }));


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
    if(err.code == 'PROTOCOL_CONNECTION_LOST'){
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
  let sql = handleDiscount(); 
  app.get('/tasks', (req,res) => {
    sql.query("SELECT * from tasks", (err, rows, fields) => {

        if(rows.length == 0){
            console.log('No data found!')
        }
        else
        {
            res.json({data: rows})
        }
    })

    sql.release(); 
})

app.post('/task/add', (req, res) => {
        const reqBody = JSON.stringify(req.body);
        const request = JSON.parse(reqBody)
        let response = "";
        let reqStatus = false;

        request.forEach(task => {

            console.log('task: ', task)
            // const id = task.id;
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
            // const content = task.content;
            const timestamp = Date.now();
            const checked = task.taskChecked;
            sql.query("INSERT INTO tasks(task, category, timestamp, taskDay, taskMonth, taskYear, taskHour, taskMinute, taskSecond, tID, priority,taskChecked) " +
                "VALUES ('" + taskContent + "','" + category + "','" + timestamp + "','" + taskDay + "','" + taskMonth + "','"
                + taskYear + "','" + taskHour + "','" + taskMinute + "','" + taskSecond + "','" + taskID + "','" + taskPriority + "'," + "'"  + checked + "');",
                (err, result) => {
                    console.log('err: ', err);
                    // console.log('result: ', result);
                if(err){
                    reqStatus = false;
                    console.log('Error: ' + err);
                }
                else
                {
                    reqStatus = true;
                }

            });
        });

        if(reqStatus){
            res.json({
                'response': 'success',
                'code': 200,
                'body': null
            });
        }
        else{
            res.json({
                'response': 'error',
                'code': 400,
                'body': null
            });
        }
});

app.post('/tasks/delete', (req,res) => {
    sql.query("truncate `tasks`;", (err, result) => {
        if (err) {
            throw err;
        } else {
            res.json({
                'response': 'success',
                'code': 200,
                'body': null
            })
        }
    })
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