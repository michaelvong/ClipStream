import axios from "axios";
import { useEffect, useState } from "react";
export default function ClipsGrid({clips}) {


    return (
        <div>
            <div className="grid grid-cols-5">
                {clips?.length > 0 && clips.map((clip, index) => (
                    <div>
                        {index}
                    </div>
                ))}    
            </div>
        
        </div>
    );
};