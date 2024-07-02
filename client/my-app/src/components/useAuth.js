import axios from "axios";
import { useEffect, useState } from "react";

export default function UseAuth(code){
    const [accessToken, setAccessToken] = useState();
    const [expiresIn, setExpiresIn] = useState();
    const [refreshToken, setRefreshToken] = useState();
    
    useEffect(() => {
        //prevent the hooks from running again when page refreshed and token exists
        if(localStorage.getItem("access_token") !== "undefined"){
            //console.log(localStorage.getItem("access_token"));
            return;
        }
        axios.post('http://localhost:3001/auth', {
            client_id : process.env.REACT_APP_TWITCH_CLIENT_ID,
            redirect_uri : "http://localhost:3000",
            client_secret : process.env.REACT_APP_TWITCH_CLIENT_SECRET,
            code : code,
            grant_type : "authorization_code"
        }).then((response) => {
            //console.log(response.data);
            setAccessToken(response.data.access_token);
            setExpiresIn(response.data.expires_in);
            setRefreshToken(response.data.refresh_token);
            window.history.pushState({}, null, "/")
        }).catch(() => {
            //window.location = "/";
        })
    }, [code])

    useEffect(() => {
        //if statement to do nothing if no refresh token or expires in
        if(!refreshToken || !expiresIn) {
            return
        }
        const interval = setInterval(() => {
            axios.post("http://localhost:3001/refresh", {
                refreshToken,
                client_id : process.env.REACT_APP_TWITCH_CLIENT_ID,
                client_secret : process.env.REACT_APP_TWITCH_CLIENT_SECRET,
            }).then(res => {
                //console.log(res.data)
                setAccessToken(res.data.access_token)
                //setRefreshToken(res.data.refresh_token)
                setExpiresIn(res.data.expires_in)
                //window.history.pushState({}, null, "/")
            }).catch(() => {
                window.location = "/"
            })
        }, (expiresIn - 60) * 1000) 
        //subtract 60 seconds and times 1000 to convert seconds to milliseconds 
        return () => clearInterval(interval)  
    }, [refreshToken, expiresIn])

    return accessToken;
};