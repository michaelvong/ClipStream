import axios from "axios";
import { useEffect, useState } from "react";
import {Link} from "react-router-dom";
import InfoBox from "./InfoBox";

export default function ClipsGrid({clips}) {
    const [displayedData, setDisplayedData] = useState([])
    const [page, setPage] = useState(0);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        try{
            setLoading(true);
            //console.log({clips}.clips.slice(0,10))
            setDisplayedData([...displayedData, ...{clips}.clips.slice(page*30,(page+1)*30)]);
            //console.log([...displayedData])
            //console.log({clips}.clips.slice(page*30,(page+1)*30))
            //console.log([...displayedData, ...{clips}.clips.slice(page*30,(page+1)*30)])
        } catch(e){
            console.log("error: " + e);
        }
    }, [page]);

    useEffect(() => {
        //console.log(displayedData);
    }, [displayedData])

    const handleScroll = () => {
        if (
            window.innerHeight +
            document.documentElement.scrollTop ===
            document.documentElement.offsetHeight
        ) {
            console.log('end of page scroll');
            setPage(prevPage => prevPage + 1);
        }
    };

    useEffect(() => {
        window.addEventListener('scroll', handleScroll);
        //console.log('mounted scroll');
        return () =>
            //console.log('unmounted scroll')
            //this return is triggered when component unmounts
            window.removeEventListener('scroll', handleScroll);
    }, []);

//<iframe src={`${item.embed_url}&parent=localhost`} sandbox="allow-same-origin allow-scripts" frameborder="0" allowfullscreen="true" height="378" width="620">ts</iframe>
    return (
        <div>
            <div className="grid grid-cols-4 gap-20">
                {displayedData.map((item, index) => (
                    <div>                            
                        <InfoBox {...item} />
                    </div>
                ))}
            </div>
        </div>
    );
};