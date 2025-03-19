import React, { useState ,useEffect } from "react";
import { FaEye, FaEyeSlash } from 'react-icons/fa'; 
import { useNavigate } from "react-router-dom";
import toast from 'react-hot-toast';
import { loginWithMail } from "../../firebase"
import { signInWithGoogle } from "../../firebase";

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const user = await loginWithMail(email, password, navigate);
  
      if (user) {
        const userData = { email, token: "example-token" };
  
        if (rememberMe) {
          localStorage.setItem("user", JSON.stringify(userData));  
        } else {
          sessionStorage.setItem("user", JSON.stringify(userData));
        }
  
        navigate("/home");
      }
    } catch (error) {
      toast.error("Login failed");
      console.log(error);
    }
  };

  const googleAuthFunc = async (e) => {
    e.preventDefault();
    try {
      const user = await signInWithGoogle(navigate);
      localStorage.setItem("user", JSON.stringify(user));  
      console.log(user);
      navigate("/home")
    } catch (error) {
      toast.error("Registration failed:", error.message);
      console.log(error);
    }
  };
  
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || sessionStorage.getItem("user");
  
    if (storedUser) {
      navigate("/home");
    }
  }, [navigate]);
  

  return (
    <div className="flex min-h-full flex-1 flex-col justify-center px-6 py-12 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-sm">
        <h2 className="mt-10 text-center text-2xl/9 font-bold tracking-tight text-gray-900">
          Welcome to STAPLE
        </h2>
      </div>

      <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={e=> setEmail(e.target.value)}
                placeholder="Email"
                required
                autoComplete="email"
                className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
              />
            </div>
          </div>

         <div className="relative mt-2">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="block w-full rounded-md bg-white px-3 py-1.5 text-base text-gray-900 outline outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-400 focus:outline focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
            />
            <button
              type="button"
              onClick={togglePasswordVisibility}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500"
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />} {}
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                checked={rememberMe}
                onChange={() => setRememberMe(!rememberMe)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <button 
                type="button" 
                className="font-semibold text-indigo-600 hover:text-indigo-500"
                onClick={() => navigate("/forgetPassword")}
              >
                Forgot password?
              </button>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm/6 font-semibold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              Log in
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative flex items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="px-4 text-gray-500">Or continue with</span>
            <div className="flex-grow border-t border-gray-300"></div>
          </div>

          <div className="mt-6 flex justify-center space-x-4">
            <button 
              onClick={googleAuthFunc} 
              className="flex items-center border-2 border-gray-300 px-6 py-2 rounded-lg text-gray-900 hover:bg-gray-100 hover:border-gray-600 gap-x-2"
            >
              <img
                src="https://img.icons8.com/?size=100&id=17949&format=png&color=000000"
                alt="Google Logo"
                className="h-8 w-8"
              />
              Sign in with Google
            </button>
          </div>
        </div>

        <p className="mt-5 text-center text-sm/6 text-gray-500">
          Not a member?{' '}
          <a href="./signin" className="font-semibold text-indigo-600 hover:text-indigo-500">
            Register Now
          </a>
        </p>
      </div>
      </div>
  );
};

export default Login;
