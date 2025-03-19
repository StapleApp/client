import { useState } from 'react';
import { BsFillLightningFill, BsGearFill } from 'react-icons/bs';
import { FaFire, FaStapler } from 'react-icons/fa6';
import { FaRegArrowAltCircleRight, FaRegArrowAltCircleLeft} from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logoDark.svg';
import './Navigator.css';

const Navigator = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <div className={`fixed top-0 -left-20 z-1 ml-16 h-screen
                            bg-[#7496a1] text-[#c1b2f6] shadow-lg
                            transition-all duration-150 ease-linear
                            ${isExpanded ? 'w-64' : 'w-0'}`}>
                <div className={`flex bg-[#89A8B2] rounded-2xl ml-8 mr-8 w-48 h-10 mt-2 mb-2
                                transition-all duration-100 delay-20
                                text-[#B3C8CF] text-2xl font-bold justify-center items-center
                                ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                    STAPLE APP
                </div>
                <div className={`flex bg-[#89A8B2] rounded-2xl ml-8 mr-8 w-48 h-10 mt-2 mb-2
                                transition-all duration-100 delay-20
                                text-[#B3C8CF] text-2xl font-bold justify-center items-center
                                ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                    Ana Sayfa
                </div>
                <div className={`flex bg-[#89A8B2] rounded-2xl ml-8 mr-8 w-48 h-10 mt-2 mb-2
                                transition-all duration-100 delay-20
                                text-[#B3C8CF] text-2xl font-bold justify-center items-center
                                ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                    Arkadaş Ekle
                </div>
                <div className={`flex bg-[#89A8B2] rounded-2xl ml-8 mr-8 w-48 h-10 mt-2 mb-2
                                transition-all duration-100 delay-20
                                text-[#B3C8CF] text-2xl font-bold justify-center items-center
                                ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                    Test
                </div>
                <div className={`fixed flex bg-[#89A8B2] rounded-2xl ml-8 mr-8 w-48 h-10 mt-2 mb-2
                                transition-all duration-100 delay-20 bottom-12
                                text-[#B3C8CF] text-2xl font-bold justify-center items-center
                                ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                    Küçült
                </div>
                <div className={`fixed flex bg-[#89A8B2] rounded-2xl ml-8 mr-8 w-48 h-10 mt-2 mb-2
                                transition-all duration-100 delay-20 bottom-0
                                text-[#B3C8CF] text-2xl font-bold justify-center items-center
                                ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                    Ayarlar
                </div>
            </div>
            <div className={isExpanded ? `fixed flex flex-col top-0 left-55 h-screen gap-0 z-1
            w-16 transition-all duration-145 ease-linear
            bg-[#89A8B2] text-[#c6b9f4] shadow-lg` : `fixed flex flex-col top-0 left-0 h-screen gap-0 z-1
            w-16 transition-all duration-145 ease-linear
            bg-[#89A8B2] text-[#c6b9f4] shadow-lg`}>
                <SideBarImg  />
                <SideBarHome />
                <SideBarFriend />
                <SideBarTest />
                <SideBarIconExpand
                    icon={isExpanded ? <FaRegArrowAltCircleLeft size="35" /> : <FaRegArrowAltCircleRight size="35" />}  
                    toggleExpand={() => setIsExpanded(!isExpanded)} 
                />
                <SideBarIconSettings />
            </div>
        </>
    );
};

const SideBarImg = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className="sidebar-icon group cursor-pointer hover:scale-120" onClick={() => navigate("/")}>
                <img src={logo} className="w-10 rounded-3xl" alt={"logo"} />
                <span className="sidebar-tooltip group-hover:scale-100">Staple App</span>
            </div>
            <hr className="border-gray-600" />
        </>
    );
};

const SideBarHome = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className="sidebar-icon group cursor-pointer hover:scale-120" onClick={() => navigate("/")}>
                <FaFire size="20" />    
                <span className="sidebar-tooltip group-hover:scale-100">Ana Sayfa</span>
            </div>
            <hr className="border-gray-600" />
        </>
    );
};

const SideBarFriend = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className="sidebar-icon group cursor-pointer hover:scale-120" onClick={() => navigate("/ArkadasEkle")}>
                <FaStapler size="20" />
                <span className="sidebar-tooltip group-hover:scale-100">{"Arkadaş Ekle"}</span>
            </div>
        </>
    );
};

const SideBarTest = () => {
    const navigate = useNavigate();
    return (
        <>
            <div className="sidebar-icon group cursor-pointer hover:scale-120" onClick={() => navigate("/Test")}>
                <BsFillLightningFill size="20" />
                <span className="sidebar-tooltip group-hover:scale-100">Test</span>
            </div>
            <hr className="border-gray-600" />
        </>
    );
};

const SideBarIconExpand = ({ icon, toggleExpand }) => {
    return (
        <div className="absolute bottom-12 w-full mb-2">
            <hr className="border-gray-600" />
            <div className="sidebar-icon group cursor-pointer hover:scale-120 ml-3" onClick={toggleExpand}>
                {icon}
                <span className="sidebar-tooltip group-hover:scale-100">Genişlet</span>
            </div>
        </div>
    );
};

const SideBarIconSettings = () => {
    const navigate = useNavigate();
    return (
        <div className="absolute bottom-0 w-full">
            <hr className="border-gray-600" />
            <div className="sidebar-icon group cursor-pointer hover:scale-120 justify-items-end ml-3" onClick={() => navigate("/Ayarlar")}>
                <BsGearFill size="22" />
                <span className="sidebar-tooltip group-hover:scale-100">Ayarlar</span>
            </div>
        </div>
    );
};

export default Navigator;
