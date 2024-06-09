import express from 'express'
import { Server } from "socket.io"
import path from 'path'
import { fileURLToPath } from 'url'

//__dirname not available to module, bc importing not requiring.
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const PORT = process.env.PORT || 5500
const ADMIN = "Admin"


const app = express()

app.use(express.static(path.join(__dirname, "public")))

const expressServer = app.listen(PORT, ()=>{
    console.log(`listening on port ${PORT}`)
})

//state for user
const UsersState = {
    users: [], 
    setUsers: function(newUsersArray){
        this.users = newUsersArray
    }
}

const io = new Server(expressServer, {
    cors:{
        origin: process.env.NODE_ENV === "production" ? false : ["http://localhost:5500", "http://127.0.0.1:5500"]
    }
})

io.on('connection', socket => {

    console.log(`user ${socket.id} connected`)

    //when connecting send message to only user that connects
    socket.emit('message', buildMessage(ADMIN, "Welcome to the Common Room!"))

    //listener for entering specific common room

    socket.on('enterRoom', ({name, room})=>{
        //leave prev room announce to prev room
        const prevRoom = findUser(socket.id)?.room

        if (prevRoom){
            socket.leave(prevRoom)
            io.to(prevRoom).emit('message', buildMessage(ADMIN, `${name} left us...`))
        }

        const user = activateUser(socket.id, name, room)

        //unable update prev room usr list b4 state update in activate user
        if (prevRoom){
            io.to(prevRoom).emit('userList', {
                users: studentList(prevRoom)
            })
        }

        //join room
        socket.join(user.room)

        //only to user that joins:
        socket.emit('message', buildMessage(ADMIN, `You have joined the ${user.room} common room!`))

        //to everyone
        socket.broadcast.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} has joined the common room!`))

        //update userlist for room
        io.to(user.room).emit('userList', {
            users: studentList(user.room)
        })

        //update room list for everyone
        io.emit('roomList', {
            rooms: selectCommonRooms()
        })

    })

    
    // //upon connection send message to all in chatroom
    // socket.broadcast.emit('message', `${socket.id.substring(0,5)}} connected`)


    //when user disconnects, tell all others
    socket.on('disconnect', ()=>{
        const user = findUser(socket.id)
        userLeave(socket.id) 
        if (user){
            //disconnection announcement
            io.to(user.room).emit('message', buildMessage(ADMIN, `${user.name} has left the common room`))

            //update userlist in room
            io.to(user.rom).emit('userList', {
                users: studentList(user.room)
            })

            //update room list
            io.emit('roomList', {
                rooms: selectCommonRooms()
            })
        }
    })

    //listening for message event
    socket.on('message', ({name, text}) =>{
        const room = findUser(socket.id)?.room
        if(room){
            io.to(room).emit('message', buildMessage(name, text))
        }
        
    })
    

    //listen for activity 
    socket.on('activity', (name)=>{
        const room = findUser(socket.id)?.room
        if (room){
            socket.broadcast.to(room).emit('activity', name)
        }
        
    })

})

//display messages with user information date/time/name/text - does not effect user state

function buildMessage(name, text){
    return{
        name,
        text,
        time: new Intl.DateTimeFormat('default', {
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric'
        }).format(new Date())
    }
}

//user functions


//when user enters app
function activateUser(id, name, room){
    const user = {id, name, room}
    UsersState.setUsers([
        ...UsersState.users.filter(user=> user.id !== id),
        user
    ])
    return user
}

//when user leaves app
function userLeave(id){
    UsersState.setUsers([
        UsersState.users.filter(user => user.id !== id)
    ])
}

//find a user
function findUser(id){
    return UsersState.users.find(user => user.id === id)
}

//compile users in room
function studentList(room){
    return UsersState.users.filter(user => user.room === room)
}

//show all active rooms
function selectCommonRooms(){
    return Array.from(UsersState.users.map(user => user.room))
}