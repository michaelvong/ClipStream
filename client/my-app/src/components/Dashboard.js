import { useEffect, useState } from "react";
import UseAuth from "./useAuth";
import axios from "axios";

export default function Dashboard({code}){

    const token = UseAuth(code);

    async function test(){
        await axios.get('http://localhost:3001/test',{

        })
    }

    return (
        <>
            {token}test
            <button onClick={test}>Test</button>
        </>
    );
};