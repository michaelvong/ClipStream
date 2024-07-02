/* eslint-disable jsx-a11y/alt-text */
export default function InfoBox({url, thumbnail_url, title, view_count, broadcaster_name, created_at}){
    return (
        <div className="box-border border-4 border-gray-600 h-100 w-100 bg-gray-400 rounded-md">
            <div className="">
                <a href={`${url}`} target="_blank" rel="noreferrer">
                    <img className="object-scale-down w-full h-full rounded-lg" src={`${thumbnail_url}`}/>
                </a>
                <div className="flex justify-between p-2">
                    <div className="text-xl">
                        {broadcaster_name}
                    </div>
                    <div>
                        {view_count} views
                    </div>
                </div>
                <div className="flex p-1.5">
                    "{title}"
                </div>
            </div>
        </div>
    );
};