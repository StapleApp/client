import logo from "../assets/logoDark.svg"

const Test = () => {
    return(
        <>
            <div className="fixed grid grid-cols-3 bg-[var(--primary-text)] text-[var(--secondary-text)] h-screen w-screen left-16 top-0 z-0">
                <div className="w-auto h-auto col-start-2 mt-auto mb-auto text-5xl font-bold">
                    <img src={logo} className="rounded-full opacity-30" />
                    TEST
                </div>   
            </div>
        </>
    );   
};
  
export default Test;