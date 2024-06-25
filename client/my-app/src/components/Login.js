
export default function Login(){
    const scope = "user:read:follows";
    return(
        <a href= {`https://id.twitch.tv/oauth2/authorize`+
            `?response_type=code`+
            `&client_id=${process.env.REACT_APP_TWITCH_CLIENT_ID}`+
            `&redirect_uri=${process.env.REACT_APP_REDIRECT_URI}`+
            `&scope=${scope}`} >
            Login
        </a>
    );
};