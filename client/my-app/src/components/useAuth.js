import axios from "axios";
import { useEffect, useState } from "react";

export default function UseAuth(code){
    const [accessToken, setAccessToken] = useState();
    const [expiresIn, setExpiresIn] = useState();
    const [refreshToken, setRefreshToken] = useState();
    
    useEffect(() => {
        axios.post('http://localhost:3001/auth', {
            client_id : process.env.REACT_APP_TWITCH_CLIENT_ID,
            redirect_uri : "http://localhost:3000",
            client_secret : process.env.REACT_APP_TWITCH_CLIENT_SECRET,
            code : code,
            grant_type : "authorization_code"
        }).then((response) => {
            //console.log(response);
            setAccessToken(response.access_token);
            setExpiresIn(response.expires_in);
            setRefreshToken(response.refresh_token);
            console.log(response);
            window.history.pushState({}, null, "/")
        }).catch(() => {
            //window.location = "/";
        })
    }, [code])

    return accessToken;
};