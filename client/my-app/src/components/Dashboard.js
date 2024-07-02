import { useEffect, useState } from "react";
import UseAuth from "./useAuth";
import axios from "axios";
import Header from "./Header";
import ClipsGrid from "./ClipsGrid";

export default function Dashboard({code}){
    const [clips, setClips] = useState();
    let access_token = localStorage.getItem("access_token")
    console.log(access_token);
    if(access_token === 'undefined'  || !access_token){
        access_token = UseAuth(code);
        localStorage.setItem("access_token", access_token);
        console.log(access_token);
    }
    

    useEffect(() => {
        const config = {
            method: 'get',
            url : 'http://localhost:3001/clips',
            headers : {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + localStorage.getItem('access_token'),
                'Client-Id': process.env.REACT_APP_TWITCH_CLIENT_ID,
            },
        }
        axios(config)
        .then((response) => {
            console.log(response);
            setClips(response.data.clips);
            //console.log(clips);
        }).catch((error) => {
            console.log(error);
        });
        console.log('use effect to get clips completed successfully');
    }, []);

    useEffect(() => {
        console.log(clips);
        console.log('clips changed')
    }, [clips]);
    //<iframe src="https://clips.twitch.tv/embed?clip=InnocentAntediluvianCarabeefPanicBasket-6MfF_-tWB7yv0_CD&parent=localhost" sandbox="allow-same-origin allow-scripts" frameborder="0" allowfullscreen="true" height="378" width="620">ts</iframe>

    return (
        <div>
            <Header/>
            <div className="p-10 bg-gray-200">
                <div>
                    Followed clips
                </div>                     
                {clips?.length > 0 && 
                <div>
                    <ClipsGrid clips={clips}>
                        
                    </ClipsGrid>
                </div>}
            </div> 
        </div>
        
        
                
    );
};