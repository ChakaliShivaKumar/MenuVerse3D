// Smooth scroll for navigation links
document.addEventListener('DOMContentLoaded', function() {
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#') return;
            
            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const offsetTop = target.offsetTop - 80; // Account for fixed navbar
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    
    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
        });

        // Close mobile menu when clicking on a link
        mobileMenu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
            });
        });
    }

    // View Demo button handler
    const viewDemoBtn = document.getElementById('view-demo-btn');
    if (viewDemoBtn) {
        viewDemoBtn.addEventListener('click', function() {
            const demoSection = document.getElementById('demo');
            if (demoSection) {
                const offsetTop = demoSection.offsetTop - 80;
                window.scrollTo({
                    top: offsetTop,
                    behavior: 'smooth'
                });
            }
        });
    }

    // Try Demo button handler
    const tryDemoBtn = document.getElementById('try-demo-btn');
    if (tryDemoBtn) {
        tryDemoBtn.addEventListener('click', function() {
            alert('Demo functionality coming soon! In the meantime, you can embed a model-viewer component here.\n\nExample:\n<model-viewer src="assets/demo-model.glb" auto-rotate camera-controls></model-viewer>');
        });
    }

    // Early Access Form Handler
    const earlyAccessForm = document.getElementById('early-access-form');
    if (earlyAccessForm) {
        earlyAccessForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const restaurantName = document.getElementById('restaurant-name').value;
            const email = document.getElementById('email').value;
            
            if (restaurantName && email) {
                alert(`Thank you for your interest, ${restaurantName}!\n\nWe've received your early access request for ${email}.\n\nWe'll be in touch soon!`);
                
                // Reset form
                earlyAccessForm.reset();
            } else {
                alert('Please fill in all fields.');
            }
        });
    }

    // Add scroll effect to navbar
    let lastScroll = 0;
    const navbar = document.querySelector('nav');
    
    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            navbar.classList.add('shadow-lg');
        } else {
            navbar.classList.remove('shadow-lg');
        }
        
        lastScroll = currentScroll;
    });

    // Check if running on file:// protocol (which causes CORS issues)
    const isFileProtocol = window.location.protocol === 'file:';
    
    if (isFileProtocol) {
        // Show warning immediately if on file:// protocol
        console.warn('⚠️ Running on file:// protocol. 3D models will not load due to CORS restrictions.');
        showProtocolWarning();
    }

    // Handle model-viewer errors
    const heroViewer = document.getElementById('hero-model-viewer');
    const demoViewer = document.getElementById('demo-model-viewer');

    function handleModelError(viewer, viewerName) {
        if (!viewer) return;

        viewer.addEventListener('error', (event) => {
            console.error(`${viewerName} error:`, event.detail);
            
            // Show warning for any error type (loadfailure, network, etc.)
            if (event.detail) {
                const errorType = event.detail.type || 'unknown';
                const sourceError = event.detail.sourceError;
                
                // Check for CORS/network errors
                if (errorType === 'loadfailure' || 
                    errorType === 'error' ||
                    (sourceError && (sourceError.message?.includes('Failed to fetch') || 
                                    sourceError.message?.includes('CORS') ||
                                    sourceError.message?.includes('NetworkError')))) {
                    showServerWarning(viewer);
                } else {
                    // Show generic error for other issues
                    showServerWarning(viewer, 'Model failed to load. Please ensure you are running a local server.');
                }
            }
        });

        viewer.addEventListener('load', () => {
            console.log(`✅ ${viewerName} loaded successfully`);
        });
    }

    function showProtocolWarning() {
        // Create a banner at the top of the page
        const banner = document.createElement('div');
        banner.className = 'fixed top-16 left-0 right-0 bg-yellow-500 text-yellow-900 px-4 py-3 z-50 shadow-lg';
        banner.innerHTML = `
            <div class="max-w-7xl mx-auto flex items-center justify-between">
                <div class="flex items-center space-x-3">
                    <i class="fas fa-exclamation-triangle text-xl"></i>
                    <div>
                        <p class="font-semibold">⚠️ CORS Error: Please use a local server</p>
                        <p class="text-sm">3D models cannot load when opening files directly. Run: <code class="bg-yellow-600 text-yellow-100 px-2 py-1 rounded text-xs">python3 server.py</code></p>
                    </div>
                </div>
                <button onclick="this.parentElement.parentElement.remove()" class="text-yellow-900 hover:text-yellow-700">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
    }

    function showServerWarning(viewer, customMessage = null) {
        // Check if warning already exists
        const container = viewer.parentElement;
        if (container.querySelector('.cors-warning')) {
            return; // Warning already shown
        }

        const warningDiv = document.createElement('div');
        warningDiv.className = 'cors-warning absolute inset-0 bg-yellow-50 border-2 border-yellow-400 rounded-lg flex items-center justify-center p-4 z-10';
        warningDiv.innerHTML = `
            <div class="text-center text-yellow-800 max-w-md">
                <i class="fas fa-exclamation-triangle text-4xl mb-3"></i>
                <p class="font-semibold mb-2">${customMessage || 'CORS Error Detected'}</p>
                <p class="text-sm mb-3">${customMessage || 'Please run a local server instead of opening the file directly.'}</p>
                <div class="bg-yellow-100 rounded p-3 mt-3 text-left">
                    <p class="text-xs font-semibold mb-2">Quick Fix:</p>
                    <p class="text-xs mb-1">1. Open terminal in: <code class="bg-yellow-200 px-1 rounded">marketing-site</code> folder</p>
                    <p class="text-xs mb-1">2. Run: <code class="bg-yellow-200 px-1 rounded">python3 server.py</code></p>
                    <p class="text-xs">3. Visit: <code class="bg-yellow-200 px-1 rounded">http://localhost:8000</code></p>
                </div>
            </div>
        `;
        
        if (container) {
            container.style.position = 'relative';
            container.appendChild(warningDiv);
        }
    }

    // Set up error handlers for both viewers
    if (heroViewer) {
        handleModelError(heroViewer, 'Hero model viewer');
    }
    
    if (demoViewer) {
        handleModelError(demoViewer, 'Demo model viewer');
    }
});
