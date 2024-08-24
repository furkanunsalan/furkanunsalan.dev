import { FaSpinner } from 'react-icons/fa';


const Loading = () => {
    return (
        <div className='flex flex-col items-center justify-center h-screen '>
            <FaSpinner className="animate-spin mx-auto size-20" />
        </div>
    );
}


export default Loading;