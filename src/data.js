// Data objects for the portfolio website

export const aboutContent = {
  title: "About Me",
  greeting: "Hi, I'm Ihsan! :)",
  description: "I'm a fast learner who thrives on tackling ambitious technical challenges, from nuclear fusion and advanced power electronics to electrohydrodynamics, PCB design, and FPGA systems.",
  points: [
    "I pick things up quickly and bring a broad, hands-on skill set to the table, helping me approach problems from multiple perspectives and move projects forward efficiently.",
    "I thrive in fast-paced environments where I can make thoughtful, high-impact decisions and take ownership of key initiatives.",
    "My curiosity and ambition push me to pursue a wide range of projects, each deepening my understanding and expanding my capabilities.",
    "I care deeply about sustainability and social impact, a focus that often drives my engineering work, like building an ionic thruster for eco-conscious propulsion.",
    "I'm a native French, German, and English speaker, and a beginner in Spanish, which helps me collaborate across cultures and teams with ease."
  ],
  closing: "Would love to connect and chat about cutting edge engineering! :D",
  contact: "Shoot me a message on LinkedIn or email hi@ihsan.cc"
};

export const experiences = [
      {
        id: 1,
        title: "Signal Integrity Engineer",
        company: "Arista Networks",
        period: "Sep 2025 - Present",
        logo: "/images/arista-logo.png",
        description: "Contributing to the development of ultra-high-speed, high bandwidth, and low-latency data-center switches for both conventional and AI data-center markets.",
        responsibilities: [
          "Simulated and optimized 200G PAM4 SerDes and PCIe Gen 5 differential pairs using HyperLynx, HFSS, ADS, and Sigrity",
          "Investigated insertion/return losses and TDRs to perform root cause analysis of SI concerns and make PCB layout modifications",
          "Tuned vias and ASIC/connector breakouts to meet loss budgets through iterative deduction, 3D modelling and simulation",
          "Provided detailed signal integrity reports and collaborated with HW engineers to develop layout of 102.4T switches",
          "Performed PCB material characterization and system debug at up to 70GHz using ultra high-end VNAs, TDRs, and oscilloscopes",
          "Used Cadence tools to work on and review schematics and layouts and provide hardware design recommendations",
          "Prototyped and implemented setups to test viability of future designs, validate current PCBs and perform case-by-case debug"
        ]
      },
  {
    id: 2,
    title: "Electronics Designer",
    company: "Waterloo Rocketry Design Team",
    period: "Sep 2024 - Present",
    logo: "/images/waterloo-rocketry-logo.png",
    description: "Performed PCB design and review for rocket and ground-side electronics, including power distribution systems and embedded PIC18-based boards with custom MPLAB X firmware development.",
    responsibilities: [
      "Designed and implemented electronics and firmware/DSP pipeline for a Xilinx FPGA-based GNSS receiver from scratch",
      "Collaborated with a team of students to coordinate the electrical design of the rocket and make effective executive decisions on projects"
    ]
  },
  {
    id: 3,
    title: "Power Electronics Co-Op and then Electronics Contractor",
    company: "aiRadar Inc.",
    period: "Jan 2025 - May 2025",
    logo: "/images/airadar-logo.png",
    description: "Spearheaded end-to-end redesign of 3.5MHz GaN, wide input/output multi-stage dc-to-dc converter for advanced multi-beam sonar, including research, topology selection, simulation, firmware development and testing.",
    responsibilities: [
      "Implemented robust STM32 firmware with voltage-fed PID control, live telemetry, and extensive UART command interface",
      "Designed and built breadboard prototypes using GaN FET eval kits and STM32 dev boards for initial testing and PID tuning",
      "Proposed and validated converter topologies using LTspice simulations that accounted for parasitics at MHz frequencies",
      "Authored extensive technical documentation in LaTeX detailing power electronics theory, designs tradeoffs, simulation, custom mathematical models, component selection, and embedded firmware architecture",
      "Developed and executed board bring-up and test plan; rapidly iterated on testing methodology based on real-time results",
      "Collaborated with a fast-paced engineering team and provided regular updates on design, timeline and executive decisions"
    ]
  },
  {
    id: 4,
    title: "U14/U16 Assistant Ski Racing Coach",
    company: "Cypress Ski Club",
    period: "Jan 2025 - Apr 2025",
    logo: "/images/cypress-ski-club-logo.png",
    description: "Drew on a decade of ski racing experience to coach, mentor, and inspire under-14 and under-16 age groups.",
    responsibilities: [
      "Developed and executed training plans in various training and racing environments",
      "Ensured the safety of the ski racing group while maintaining high performance standards"
    ]
  }
];

export const projects = [
      {
        id: 1,
        title: "Ionic Thruster",
        image: "/images/ionic.jpg",
        description: [
          "Designed and constructed functioning 50kV 100W high voltage (HV) flyback power converter with Cockcroft-Walton voltage multiplier simulated in LTspice",
          "Designed and built working electrohydrodynamic (ionic) thruster that achieved wind speeds of 1.5ms⁻¹ and thrust of 40mN",
          "Inspired by MIT research, authored paper in which the optimal electrode pair spacing in single-stage thrusters consisting of two electrode pairs in parallel operation was derived and confirmed in a custom experiment"
        ],
        skills: ["High Voltage", "Electrohydrodynamics", "Plasma Physics", "LTspice", "MIT Research"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/IonicThruster/overview/",
          github: "https://github.com/ihsan/ionic-thruster"
        }
      },
  {
    id: 2,
    title: "3.5MHz GaN DC-DC Converter",
    image: "/images/dcdc3500KHz.png",
    description: "Spearheaded end-to-end redesign of a 3.5MHz GaN, wide input/output multi-stage DC-to-DC converter for advanced multi-beam sonar. Involved topology selection, LTspice simulation with GaN FET body diode analysis, mathematical validation, STM32 firmware development with PID control and telemetry, component selection, and extensive testing from early protoboard designs to refined home lab prototype.",
    skills: ["STM32", "PID Control", "LTspice", "LaTeX", "GaN FET", "Power Electronics"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/GaN_DCDC_Converter/overview/",
          github: "https://github.com/ihsan/gan-dc-dc-converter"
        }
  },
      {
        id: 3,
        title: "Lorentz Solver",
        image: "/images/solverImage1.png",
        description: [
          "Computes and subsequently animates particle paths in 3D through complex user-defined electromagnetic spaces which include current carrying coils, uniform E and B fields, charged particles and more for nuclear fusion reactor simulations",
          "C++ simulation engine computes Lorentz force on particles and applies 4th order Runga-Kutta method to compute position",
          "Python script plots computed particle paths and vector fields using Manim mathematical library, enabling dynamic visualizations",
          "Developing parallelized NVIDIA CUDA implementation to accelerate computation of magnetic and electric vector fields"
        ],
        skills: ["C++", "Python", "NVIDIA CUDA", "Manim", "Nuclear Fusion", "Runga-Kutta"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/LorentzSolver/overview/",
          github: "https://github.com/ihsan/lorentz-solver"
        }
      },
  {
    id: 4,
    title: "USB-C Trigger Board",
    image: "/images/usb_c_trigger_board.jpg",
    description: "Custom circuit board designed to trigger specific power delivery profiles over USB-C. Features intelligent power management and testing capabilities for specialized applications.",
    skills: ["Cadence", "PCB Design", "Power Management", "USB-C"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/USB-CTriggerBoards/Rev1/overview/",
          github: "https://github.com/ihsan/usb-c-trigger"
        }
  },
  {
    id: 5,
    title: "Flood Lights",
    image: "/images/led_panels.jpg",
    description: "Custom-built high-intensity LED floodlight system featuring efficient power management and robust design. Optimized for various lighting applications with intelligent control systems.",
    skills: ["LED Design", "Power Management", "Thermal Design", "PCB Design"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/LEDLightPanels/20V_Panel/overview/",
          github: "https://github.com/ihsan/flood-lights"
        }
  },
  {
    id: 6,
    title: "Digilent Cora Z7 Music Player",
    image: "/images/music_player.png",
    description: "Verilog implementation of SPI and UART interfaces using shift registers and state machines on Xilinx Zynq-7000. Custom DAC driver and amplifier PWM generation IP block with embedded application reading music from SD card and sending analog values over AXI4 Lite. Constructed class D power amplifier to drive woofer speakers.",
    skills: ["FPGA", "Verilog", "STM32", "C/C++", "UART/SPI/I2C", "DSP"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/CoraZ7_MusicPlayer/overview/",
          github: "https://github.com/ihsan/cora-z7-music-player"
        }
  },
  {
    id: 7,
    title: "STM32 Business Card",
    image: "/images/business_card.png",
    description: "Functional business card designed around an STM32 microcontroller. Showcases embedded systems design and creative hardware integration with interactive LED displays.",
    skills: ["STM32", "C/C++", "PCB Design", "Embedded Systems"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/BusinessCard/Rev1/overview/",
          github: "https://github.com/ihsan/stm32-business-card"
        }
  },
  {
    id: 8,
    title: "Zero Voltage Switching Driver",
    image: "/images/ZVS.png",
    description: "Designed and constructed 100W ZVS circuit for induction heating and high voltage power conversion. Power components selected to withstand large currents and dissipate heat. Custom PCB with thick exposed traces covered with solder for higher current handling. Zener diodes protect MOSFET gates.",
    skills: ["Power Electronics", "PCB Design", "High Voltage", "Thermal Design"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/ZVS_Driver/overview/",
          github: "https://github.com/ihsan/zvs-driver"
        }
  },
  {
    id: 9,
    title: "Boost Converter for PID Control",
    image: "/images/boost_converter.png",
    description: "2-day turnaround boost converter and 3D printed housing for PID controller development. 12V input with adjustable 12-40V output at a few amps. STM32-based control with full debugging capabilities including adjustable switching frequencies, output voltages, and PID constants via 3MHz high speed UART connection.",
    skills: ["STM32", "PID Control", "Power Electronics", "3D Printing", "UART/SPI/I2C"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/BoostConverter_PID/overview/",
          github: "https://github.com/ihsan/boost-converter-pid"
        }
  },
  {
    id: 10,
    title: "3D Printing Projects Collection",
    image: "/images/3DPrints.png",
    description: "Comprehensive collection of 3D printable designs including customizable storage boxes (9,000+ downloads), modular lab mounts & clips (sub 5-minute print time), secure plug protectors (18-minute print), car vent cup holders, compact cable management clips (5-minute print), and sliding door storage boxes. All designs optimized for quick printing and practical utility with Fusion 360 and OpenSCAD.",
    skills: ["3D Printing", "Fusion 360", "OpenSCAD", "Product Design"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/3D_Printing_Collection/overview/",
          github: "https://github.com/ihsan/3d-printing-projects"
        }
  },
  {
    id: 11,
    title: "Mulgrave Light Reporter",
    image: "/images/light_reporter.png",
    description: "Full-stack classroom light reporting system using React JS, Node JS, and Swift UI. Allows students to report empty lit classrooms and prompt teacher email reminders. Features both web application and iOS app for convenient reporting and congratulating classrooms.",
    skills: ["React JS", "Node JS", "Swift UI", "Full-Stack Development"],
        links: {
          docs: "https://docs.ihsan.cc/Projects/Mulgrave_LightReporter/overview/",
          github: "https://github.com/ihsan/light-reporter"
        }
  }
];

export const heroContent = {
  name: "Ihsan",
  nameColor: "#82aaff",
  subtitle: "Hardware design, signal integrity, firmware, digital design, and ethics.",
  secondarySubtitle: "Signal Integrity @ Arista | EE @ UWaterloo"
};

export const contactContent = {
  email: "hi@ihsan.cc",
  website: "https://docs.ihsan.cc"
};

export const skills = [
  {
    id: 1,
    title: "Programming",
    skills: [
      { name: "C", logo: null },
      { name: "C++", logo: null },
      { name: "Python", logo: null },
      { name: "Rust", logo: null },
      { name: "Git", logo: null },
      { name: "NVIDIA CUDA", logo: null },
      { name: "ROS 2", logo: null },
      { name: "LaTeX", logo: null },
      { name: "MATLAB", logo: null },
      { name: "SPICE", logo: null }
    ]
  },
  {
    id: 2,
    title: "FPGA",
    skills: [
      { name: "AMD/Xilinx Vivado", logo: null },
      { name: "Vitis", logo: null },
      { name: "Verilog", logo: null },
      { name: "VHDL", logo: null },
      { name: "Zynq SoC", logo: null }
    ]
  },
  {
    id: 3,
    title: "Tools",
    skills: [
      { name: "STM32", logo: null },
      { name: "PIC18", logo: null },
      { name: "AMD/Xilinx", logo: null },
      { name: "Intel/Altera", logo: null },
      { name: "Jira", logo: null },
      { name: "Confluence", logo: null },
      { name: "Slack", logo: null }
    ]
  },
  {
    id: 4,
    title: "Lab Skills",
    skills: [
      { name: "Oscilloscope", logo: null },
      { name: "SMD Rework", logo: null },
      { name: "Function Generator", logo: null },
      { name: "Electronic Load", logo: null },
      { name: "Digital Multimeter", logo: null },
      { name: "Power Supply", logo: null }
    ]
  },
  {
    id: 5,
    title: "eCAD",
    skills: [
      { name: "LTspice", logo: null },
      { name: "Altium Designer", logo: null },
      { name: "KiCAD", logo: null },
      { name: "COMSOL", logo: null },
      { name: "Fusion 360", logo: null },
      { name: "OpenSCAD", logo: null }
    ]
  },
  {
    id: 6,
    title: "Languages",
    skills: [
      { name: "French (Native)", logo: null },
      { name: "German (Native)", logo: null },
      { name: "English (Native)", logo: null },
      { name: "Spanish (Beginner)", logo: null }
    ]
  }
];

export const footerContent = {
  copyright: "© 2025 Ihsan Salari",
  socialLinks: [
    {
      name: "GitHub",
      url: "https://github.com/ihsan-sa",
      icon: "github"
    },
    {
      name: "LinkedIn",
      url: "https://linkedin.com/in/ihsan-sa",
      icon: "linkedin"
    },
    {
      name: "Email",
      url: "mailto:hi@ihsan.cc",
      icon: "email"
    },
    {
      name: "Website",
      url: "https://docs.ihsan.cc",
      icon: "website"
    }
  ]
};
