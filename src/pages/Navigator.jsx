import { useState } from 'react';
import { BsFillLightningFill, BsGearFill } from 'react-icons/bs';
import { FaFire, FaStapler } from 'react-icons/fa6';
import { MdOutlineKeyboardArrowRight, MdOutlineKeyboardArrowLeft} from "react-icons/md";
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logoDark.svg';
import '../App.css';

const Navigator = () => {
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <>
            <div className={`fixed top-0 -left-20 z-1 ml-16 h-screen
                bg-[var(--primary-bg)] shadow-lg
                transition-all duration-150 ease-linear
                flex flex-col justify-between
                ${isExpanded ? 'w-64' : 'w-0'}`}>

                {/* Üst Menü Öğeleri */}
                <div>
                    <div className={`expanded-text ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                        STAPLE APP
                    </div>
                    <div className={`expanded-text ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                        Ana Sayfa
                    </div>
                    <div className={`expanded-text ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                        Arkadaş Ekle
                    </div>
                    <div className={`expanded-text ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                        Test
                    </div>
                </div>

                {/* Alt Menü Öğeleri */}
                <div className="flex flex-col">
                    <div className={`expanded-text ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                        Küçült
                    </div>
                    <div className={`expanded-text ${isExpanded ? 'scale-100' : 'scale-0'}`}>
                        Ayarlar
                    </div>
                </div>
            </div> 

            <div className={isExpanded ? `fixed flex flex-col top-0 left-55 h-screen gap-0 z-1
            w-16 transition-all duration-145 ease-linear justify-between
            bg-[var(--primary-bg)]` : `fixed flex flex-col top-0 left-0 h-screen gap-0 z-1
            w-16 transition-all duration-145 ease-linear justify-between
            bg-[var(--primary-bg)]`}>
                <div>
                    <SideBarImg  />
                    <SideBarHome />
                    <SideBarFriend />
                    <SideBarTest />
                </div>
                <div>
                    <SideBarIconExpand
                        icon={isExpanded ? <MdOutlineKeyboardArrowLeft size="35" /> : <MdOutlineKeyboardArrowRight size="35" />}  
                        toggleExpand={() => setIsExpanded(!isExpanded)} 
                    />
                    <SideBarIconSettings />
                </div>
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
            <hr className="border-[#7496a1] border-2" />
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
            <hr className="border-[#7496a1] border-2" />
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
            <hr className="border-[#7496a1] border-2" />
        </>
    );
};

const SideBarIconExpand = ({ icon, toggleExpand }) => {
    return (
        <>
            <hr className="border-[#7496a1] border-2" />
            <div className="sidebar-icon group cursor-pointer hover:scale-120 ml-3" onClick={toggleExpand}>
                {icon}
                <span className="sidebar-tooltip group-hover:scale-100">Genişlet</span>
            </div>
        </>
    );
};

const SideBarIconSettings = () => {
    const navigate = useNavigate();
    return (
        <>
            <hr className="border-[#7496a1] border-2" />
            <div className="sidebar-icon group cursor-pointer hover:scale-120 justify-items-end ml-3" onClick={() => navigate("/Ayarlar")}>
                <BsGearFill size="22" />
                <span className="sidebar-tooltip group-hover:scale-100">Ayarlar</span>
            </div>
        </>
    );
};

export default Navigator;
