import pfp from '../assets/360.png';
import '../App.css';
import { FaUserFriends } from 'react-icons/fa';

const FriendsBar = () => {
    return(
        <div className="fixed top-0 right-0 h-screen w-48 bg-[var(--secondary-bg)] text-[var(--primary-border)] shadow-lg m-0 z-10 flex flex-col">
            {/* Başlık */}
            <div className="flex bg-[var(--secondary-bg)] rounded-2xl mx-4 w-40 h-10 mt-2 mb-2 text-[var(--primary-text)] text-xl font-bold justify-center items-center">
                ARKADAŞLAR
            </div>

            {/* Kullanıcı Listesi (Kaydırılabilir) */}
            <div className="flex-1 overflow-y-auto mx-4 w-40 mt-2 mb-2 bg-[var(--secondary-bg)] rounded-2xl text-[var(--secondary-text)] text-xs font-bold max-h-[calc(100vh-120px)]">
                <div className="grid gap-2 p-2">
                    {Array(100).fill("Chiramii").map((name, index) => (
                        <div key={index} className="flex items-center w-full h-12 bg-[var(--primary-border)] rounded-lg p-2">
                            <span className={`w-16`}><RightBarImg imgSrc={pfp} /></span>
                            <span>{name}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Profil Butonu (En Alta Sabit) */}
            <div className="relative bottom-0 mx-4 w-40 h-10 mt-2 mb-2 flex bg-[var(--secondary-bg)] rounded-2xl text-[var(--primary-border)] text-2xl font-bold justify-center items-center">
                <FaUserFriends /> Profil
            </div>
        </div>
    )
}

const RightBarImg = ({ imgSrc, link }) => {
    return (
        <div className="rightbar-icon group cursor-pointer" onClick={() => navigate(link)}>
            <img src={imgSrc} className="w-10 h-10 rounded-full" alt="logo" />
        </div>
    );
};

export default FriendsBar;