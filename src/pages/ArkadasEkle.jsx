import logo from "../assets/logoDark.svg"

const ArkadasEkle = () => {
    return(
        <>
            <div className="fixed grid grid-cols-3 bg-[#B3C8CF] text-[#E5E1DA] h-screen w-screen left-16 top-0 z-0">
                <div className="w-auto h-auto col-start-2 mt-auto mb-auto text-5xl font-bold">
                    <img src={logo} className="rounded-full opacity-30" />
                    ARKADAŞ EKLEME
                </div>
            </div>
        </>
    );   
};
  
export default ArkadasEkle;