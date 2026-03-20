import java.io.*;
import java.nio.file.*;
import java.nio.file.attribute.FileTime;
import java.nio.file.StandardCopyOption;
import java.security.*;
import java.util.*;
import javax.tools.*;
import java.net.*;
import org.json.*;

public class java_runtime {
    public static void main(String[] args) throws Exception {
        System.out.println("🚀 Java builder starting...");
        
        // Get arguments from command line - match Python pattern
        // Expected: java java_runtime <projectConfigPath> <javaConfigPath> <testName> <entryPoints...>
        if (args.length < 4) {
            System.err.println("❌ Usage: java java_runtime <projectConfigPath> <javaConfigPath> <testName> <entryPoints...>");
            System.err.println("   Note: projectConfigPath is kept for compatibility but may not be used");
            System.exit(1);
        }
        
        String projectConfigPath = args[0];
        String javaConfigPath = args[1];
        String testName = args[2];
        String[] entryPoints = Arrays.copyOfRange(args, 3, args.length);
        
        System.out.println("Java config path: " + javaConfigPath);
        System.out.println("Test name: " + testName);
        System.out.println("Entry points: " + Arrays.toString(entryPoints));
        
        // Load Java config file
        JSONObject javaConfig = loadJavaConfig(Paths.get(javaConfigPath));
        System.out.println("✅ Loaded Java config: " + javaConfig.toString(2));
        
        // Create a JSON object to store all tests' information
        JSONObject allTestsInfo = new JSONObject();
        
        // Debug: list files in /workspace
        System.out.println("\n🔍 Debug: Listing /workspace directory:");
        try {
            Files.list(Paths.get("/workspace"))
                .forEach(path -> System.out.println("    " + path.getFileName()));
        } catch (IOException e) {
            System.err.println("  Could not list /workspace: " + e.getMessage());
        }
        
        // Debug: list files in /workspace/src if it exists
        Path srcPath = Paths.get("/workspace/src");
        if (Files.exists(srcPath)) {
            System.out.println("\n🔍 Debug: Listing /workspace/src directory:");
            try {
                Files.list(srcPath)
                    .forEach(path -> System.out.println("    " + path.getFileName()));
            } catch (IOException e) {
                System.err.println("  Could not list /workspace/src: " + e.getMessage());
            }
        }
        
        // Process each entry point
        for (String entryPoint : entryPoints) {
            System.out.println("\n📦 Processing entry point: " + entryPoint);
            
            // Find the actual test file
            Path testFilePath = findTestFile(entryPoint);
            if (testFilePath == null) {
                System.err.println("❌ Test file not found: " + entryPoint);
                continue;
            }
            
            String testFileName = testFilePath.getFileName().toString();
            String testBaseName = testFileName.substring(0, testFileName.lastIndexOf('.'));
            
            // Check if this is a native test
            boolean isNativeTest = false;
            String frameworkType = null;
            try {
                // Use JavaNativeTestDetection to detect native tests
                Class<?> detectionClass = Class.forName("JavaNativeTestDetection");
                java.lang.reflect.Method translateMethod = detectionClass.getMethod("translateNativeTest", String.class);
                Object result = translateMethod.invoke(null, testFilePath.toString());
                
                if (result != null) {
                    Class<?> resultClass = result.getClass();
                    java.lang.reflect.Method isNativeMethod = resultClass.getMethod("isNativeTest");
                    java.lang.reflect.Method getFrameworkMethod = resultClass.getMethod("getFrameworkType");
                    
                    isNativeTest = (Boolean) isNativeMethod.invoke(result);
                    if (isNativeTest) {
                        frameworkType = (String) getFrameworkMethod.invoke(result);
                        System.out.println("  Detected native " + frameworkType + " test");
                    }
                }
            } catch (Exception e) {
                System.out.println("  Note: Native test detection not available: " + e.getMessage());
            }
            
            // Collect input files using the found path
            List<String> inputFiles = collectInputFiles(entryPoint);
            
            // Add native detection class if it's a native test
            if (isNativeTest) {
                Path detectionClassPath = Paths.get("/workspace/testeranto/runtimes/java/native_detection.java");
                if (Files.exists(detectionClassPath)) {
                    String relativePath = "/workspace/testeranto/runtimes/java/native_detection.java";
                    if (!inputFiles.contains(relativePath)) {
                        inputFiles.add(relativePath);
                    }
                }
            }
            
            // Compute hash
            String testHash = computeFilesHash(inputFiles);
            
            // Create artifacts directory
            Path artifactsDir = Paths.get("/workspace", "testeranto/bundles", testName);
            Files.createDirectories(artifactsDir);
            
            // Create test info JSON
            JSONObject testInfo = new JSONObject();
            testInfo.put("hash", testHash);
            JSONArray filesArray = new JSONArray();
            for (String file : inputFiles) {
                filesArray.put(file);
            }
            testInfo.put("files", filesArray);
            testInfo.put("isNativeTest", isNativeTest);
            if (isNativeTest) {
                testInfo.put("framework", frameworkType);
            }
            
            // Add to all tests info
            allTestsInfo.put(entryPoint, testInfo);
            
            // Compile the test
            Path outputJarPath = artifactsDir.resolve(testBaseName + ".jar");
            System.out.println("  🔨 Compiling test to " + outputJarPath + "...");
            
            // Create JAR file using the found path
            createJarFile(entryPoint, outputJarPath, javaConfig, isNativeTest, frameworkType);
            
            System.out.println("  ✅ Successfully created JAR");
        }
        
        // Write single inputFiles.json for all tests
        Path inputFilesPath = Paths.get("/workspace", "testeranto/bundles", testName, "inputFiles.json");
        Files.createDirectories(inputFilesPath.getParent());
        Files.write(inputFilesPath, allTestsInfo.toString(2).getBytes());
        System.out.println("\n✅ Created inputFiles.json at " + inputFilesPath + " with " + allTestsInfo.length() + " tests");
        
        System.out.println("\n🎉 Java builder completed successfully");
    }
    
    private static void createJarFile(String testPath, Path jarPath, JSONObject javaConfig, 
                                      boolean isNativeTest, String frameworkType) throws IOException {
        // Try to find the test file
        Path testFilePath = findTestFile(testPath);
        if (testFilePath == null) {
            throw new IOException("Test file not found: " + testPath + 
                " (searched in current directory and /workspace)");
        }
        
        String testFileName = testFilePath.getFileName().toString();
        String testBaseName = testFileName.substring(0, testFileName.lastIndexOf('.'));
        
        // Read the test file to extract package name
        String packageName = extractPackageName(testFilePath);
        String fullyQualifiedClassName = packageName.isEmpty() ? testBaseName : packageName + "." + testBaseName;
        
        // Create a wrapper class that serves as the main entry point
        String wrapperClassName = testBaseName + "Wrapper";
        String wrapperContent;
        
        if (isNativeTest) {
            // Generate wrapper for native tests that includes three-parameter translation
            wrapperContent = generateNativeTestWrapper(wrapperClassName, fullyQualifiedClassName, frameworkType);
        } else {
            // Original wrapper for testeranto tests
            wrapperContent = generateTesterantoWrapper(wrapperClassName, fullyQualifiedClassName);
        }
        
        // Create a manifest with the wrapper as main class
        String manifest = "Manifest-Version: 1.0\n";
        manifest += "Main-Class: " + wrapperClassName + "\n";
        
        // Add classpath if specified in config
        if (javaConfig.has("classpath")) {
            JSONArray classpathArray = javaConfig.getJSONArray("classpath");
            StringBuilder classpathBuilder = new StringBuilder();
            for (int i = 0; i < classpathArray.length(); i++) {
                if (i > 0) classpathBuilder.append(" ");
                classpathBuilder.append(classpathArray.getString(i));
            }
            manifest += "Class-Path: " + classpathBuilder.toString() + "\n";
        }
        
        // Create a temporary directory
        Path tempDir = Files.createTempDirectory("java-builder");
        try {
            // Write manifest
            Path metaInfDir = tempDir.resolve("META-INF");
            Files.createDirectories(metaInfDir);
            Files.write(metaInfDir.resolve("MANIFEST.MF"), manifest.getBytes());
            
            // Copy test file maintaining package structure
            Path testFileInJar;
            if (!packageName.isEmpty()) {
                // Create directory structure for the package
                String packagePath = packageName.replace('.', '/');
                Path packageDir = tempDir.resolve(packagePath);
                Files.createDirectories(packageDir);
                testFileInJar = packageDir.resolve(testFileName);
            } else {
                testFileInJar = tempDir.resolve(testFileName);
            }
            Files.copy(testFilePath, testFileInJar);
            
            // Write wrapper class (no package needed)
            Path wrapperFileInJar = tempDir.resolve(wrapperClassName + ".java");
            Files.write(wrapperFileInJar, wrapperContent.getBytes());
            
            // Check if Gradle has already compiled the classes (should have been done before java_runtime runs)
            Path workspace = Paths.get("/workspace");
            Path buildDir = workspace.resolve("build");
            Path classesDir = buildDir.resolve("classes/java/main");
            Path testClassesDir = buildDir.resolve("classes/java/test");
            
            if (Files.exists(classesDir) && Files.exists(testClassesDir)) {
                System.out.println("  Found compiled classes from Gradle build");
                
                // Copy compiled classes to temp directory for JAR creation
                Path tempClassesDir = tempDir.resolve("classes");
                Files.createDirectories(tempClassesDir);
                
                // Copy main classes
                copyDirectory(classesDir, tempClassesDir);
                
                // Copy test classes
                copyDirectory(testClassesDir, tempClassesDir);
                
                // Clear the temp directory and add compiled classes
                Files.walk(tempDir)
                    .filter(path -> !path.equals(tempDir) && !path.startsWith(tempClassesDir))
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
                
                // Move classes to root of tempDir
                Files.walk(tempClassesDir)
                    .forEach(source -> {
                        try {
                            Path relative = tempClassesDir.relativize(source);
                            Path dest = tempDir.resolve(relative);
                            if (Files.isDirectory(source)) {
                                Files.createDirectories(dest);
                            } else {
                                Files.createDirectories(dest.getParent());
                                Files.copy(source, dest, StandardCopyOption.REPLACE_EXISTING);
                            }
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
                
                // Clean up tempClassesDir
                Files.walk(tempClassesDir)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            } else {
                System.out.println("  WARNING: Compiled classes not found. Gradle build may have failed or not run.");
                System.out.println("  Falling back to source files for JAR creation.");
                
                // Copy Calculator.java source if it exists
                Path calculatorSource = Paths.get("/workspace/src/java/main/java/com/example/calculator/Calculator.java");
                if (Files.exists(calculatorSource)) {
                    String calculatorPackage = "com.example.calculator";
                    String packagePath = calculatorPackage.replace('.', '/');
                    Path calculatorPackageDir = tempDir.resolve(packagePath);
                    Files.createDirectories(calculatorPackageDir);
                    Path calculatorInTemp = calculatorPackageDir.resolve("Calculator.java");
                    Files.copy(calculatorSource, calculatorInTemp, StandardCopyOption.REPLACE_EXISTING);
                }
            }
            
            // Compile the wrapper class if we have compiled classes from Gradle
            // Build classpath from Gradle's build directory
            Path workspace = Paths.get("/workspace");
            Path buildDir = workspace.resolve("build");
            Path classesDir = buildDir.resolve("classes/java/main");
            Path testClassesDir = buildDir.resolve("classes/java/test");
            
            if (Files.exists(classesDir) && Files.exists(testClassesDir)) {
                // Build classpath
                StringBuilder classpath = new StringBuilder();
                classpath.append(classesDir.toString());
                classpath.append(":");
                classpath.append(testClassesDir.toString());
                
                // Add JARs from /workspace/lib
                Path libDir = Paths.get("/workspace/lib");
                if (Files.exists(libDir) && Files.isDirectory(libDir)) {
                    try (DirectoryStream<Path> jarStream = Files.newDirectoryStream(libDir, "*.jar")) {
                        for (Path jarFile : jarStream) {
                            classpath.append(":").append(jarFile.toString());
                        }
                    } catch (IOException e) {
                        System.err.println("  Warning: Could not list JARs in lib directory: " + e.getMessage());
                    }
                }
                
                // Compile wrapper class
                List<String> compileCommand = Arrays.asList(
                    "javac",
                    "-cp", classpath.toString(),
                    "-d", tempDir.toString(),
                    wrapperFileInJar.toString()
                );
                
                System.out.println("  Compiling wrapper class with classpath: " + classpath);
                ProcessBuilder compilePb = new ProcessBuilder(compileCommand);
                Process compileProcess = compilePb.start();
                int compileExitCode = compileProcess.waitFor();
                if (compileExitCode != 0) {
                    System.err.println("  WARNING: Failed to compile wrapper class");
                    // Continue anyway - the wrapper source will be included in JAR
                } else {
                    System.out.println("  Successfully compiled wrapper class");
                    // Delete the source file since we have the compiled class
                    Files.delete(wrapperFileInJar);
                }
            }
            
            // Create JAR file
            List<String> jarCommand = Arrays.asList(
                "jar", "cfm", jarPath.toString(),
                metaInfDir.resolve("MANIFEST.MF").toString(),
                "-C", tempDir.toString(), "."
            );
            
            ProcessBuilder pb = new ProcessBuilder(jarCommand);
            Process process = pb.start();
            int exitCode;
            try {
                exitCode = process.waitFor();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("JAR creation interrupted", e);
            }
            
            if (exitCode != 0) {
                throw new IOException("jar command failed with exit code " + exitCode);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted during JAR creation", e);
        } finally {
            // Clean up
            Files.walk(tempDir)
                .sorted(Comparator.reverseOrder())
                .map(Path::toFile)
                .forEach(File::delete);
        }
    }
    
    private static String generateNativeTestWrapper(String wrapperClassName, String fullyQualifiedClassName, String frameworkType) {
        return "public class " + wrapperClassName + " {\n" +
               "    public static void main(String[] args) throws Exception {\n" +
               "        System.out.println(\"Running native " + frameworkType + " test: " + fullyQualifiedClassName + "\");\n" +
               "        \n" +
               "        // Load the test class\n" +
               "        Class<?> testClass = Class.forName(\"" + fullyQualifiedClassName + "\");\n" +
               "        \n" +
               "        // For native tests, we need to run them through their respective test runners\n" +
               "        // This is a simplified version - in practice would use JUnit/TestNG runners\n" +
               "        \n" +
               "        try {\n" +
               "            // Try to find a main method\n" +
               "            java.lang.reflect.Method mainMethod = testClass.getMethod(\"main\", String[].class);\n" +
               "            mainMethod.invoke(null, (Object) args);\n" +
               "        } catch (NoSuchMethodException e) {\n" +
               "            // If no main method, print info about the test\n" +
               "            System.out.println(\"Test class loaded: \" + testClass.getName());\n" +
               "            System.out.println(\"Framework: " + frameworkType + "\");\n" +
               "            System.out.println(\"This is a native test that needs a proper test runner.\");\n" +
               "            \n" +
               "            // For JUnit tests, we could use JUnitCore\n" +
               "            if (\"" + frameworkType + "\".startsWith(\"junit\")) {\n" +
               "                System.out.println(\"To run JUnit tests, use: java -cp .:junit.jar org.junit.runner.JUnitCore \" + testClass.getName());\n" +
               "            }\n" +
               "        }\n" +
               "    }\n" +
               "}\n";
    }
    
    private static String generateTesterantoWrapper(String wrapperClassName, String fullyQualifiedClassName) {
        return "public class " + wrapperClassName + " {\n" +
               "    public static void main(String[] args) throws Exception {\n" +
               "        // Dynamically load and run the test class\n" +
               "        Class<?> testClass = Class.forName(\"" + fullyQualifiedClassName + "\");\n" +
               "        // Look for a main method\n" +
               "        try {\n" +
               "            java.lang.reflect.Method mainMethod = testClass.getMethod(\"main\", String[].class);\n" +
               "            mainMethod.invoke(null, (Object) args);\n" +
               "        } catch (NoSuchMethodException e) {\n" +
               "            // If no main method, try to instantiate and run test methods\n" +
               "            Object instance = testClass.getDeclaredConstructor().newInstance();\n" +
               "            // Look for methods annotated with @Test or similar\n" +
               "            // For now, just print a message\n" +
               "            System.out.println(\"Test class loaded: \" + testClass.getName());\n" +
               "            System.out.println(\"No main method found. You may need to implement a test runner.\");\n" +
               "        }\n" +
               "    }\n" +
               "}\n";
    }
    
    private static JSONObject loadJavaConfig(Path javaConfigFile) throws Exception {
        // Read the Java source file
        String source = new String(Files.readAllBytes(javaConfigFile));

        // Extract the class name from the file name
        String fileName = javaConfigFile.getFileName().toString();
        String className = fileName.substring(0, fileName.lastIndexOf('.'));

        // Compile the Java source
        JavaCompiler compiler = ToolProvider.getSystemJavaCompiler();
        if (compiler == null) {
            throw new RuntimeException("No Java compiler available. Make sure you're running with JDK, not JRE.");
        }

        // Create a temporary directory for compilation
        Path tempDir = Files.createTempDirectory("java_config");
        try {
            // Write the source file
            Path sourceFile = tempDir.resolve(fileName);
            Files.write(sourceFile, source.getBytes());

            // Compile with the same classpath used for the runtime
            StandardJavaFileManager fileManager = compiler.getStandardFileManager(null, null, null);
            Iterable<? extends JavaFileObject> compilationUnits =
                fileManager.getJavaFileObjectsFromFiles(Arrays.asList(sourceFile.toFile()));

            // Build classpath: include current classpath and lib directory
            String currentClasspath = System.getProperty("java.class.path");
            Path libDir = Paths.get("/workspace/lib");
            StringBuilder classpathBuilder = new StringBuilder();
            classpathBuilder.append(currentClasspath);
            
            // Add all JARs from lib directory
            if (Files.exists(libDir) && Files.isDirectory(libDir)) {
                try (DirectoryStream<Path> jarStream = Files.newDirectoryStream(libDir, "*.jar")) {
                    for (Path jarFile : jarStream) {
                        classpathBuilder.append(":").append(jarFile.toString());
                    }
                } catch (IOException e) {
                    System.err.println("Warning: Could not list JARs in lib directory: " + e.getMessage());
                }
            }
            
            List<String> options = Arrays.asList(
                "-d", tempDir.toString(),
                "-cp", classpathBuilder.toString()
            );

            JavaCompiler.CompilationTask task = compiler.getTask(
                null, fileManager, null, options, null, compilationUnits);
            boolean success = task.call();
            fileManager.close();

            if (!success) {
                throw new RuntimeException("Failed to compile Java config file: " + javaConfigFile);
            }

            // Load the compiled class
            URLClassLoader classLoader = new URLClassLoader(
                new URL[]{tempDir.toUri().toURL()},
                Thread.currentThread().getContextClassLoader()
            );
            Class<?> configClass = classLoader.loadClass(className);

            // Look for a getConfig() method that returns JSONObject
            java.lang.reflect.Method getConfigMethod = configClass.getMethod("getConfig");
            Object result = getConfigMethod.invoke(null);
            if (result instanceof JSONObject) {
                return (JSONObject) result;
            } else {
                throw new RuntimeException("getConfig() method must return JSONObject");
            }
        } finally {
            // Clean up
            Files.walk(tempDir)
                .sorted(Comparator.reverseOrder())
                .map(Path::toFile)
                .forEach(File::delete);
        }
    }
    
    private static String findConfig() {
        return "/workspace/testeranto/runtimes/java/java.json";
    }
    
    private static List<String> collectInputFiles(String testPath) {
        List<String> files = new ArrayList<>();
        
        // Find the actual test file location
        Path testFilePath = findTestFile(testPath);
        if (testFilePath == null) {
            // If not found, just add the original path
            files.add(testPath);
            return files;
        }
        
        // Add the test file itself (relative path)
        // Convert to workspace-relative path if possible
        String workspacePath = testFilePath.toString();
        if (workspacePath.startsWith("/workspace/")) {
            workspacePath = workspacePath.substring(10); // Remove "/workspace/"
        }
        files.add(workspacePath);
        
        // Look for Java files in the same directory
        Path testDir = testFilePath.getParent();
        if (testDir != null && Files.exists(testDir)) {
            try {
                Files.walk(testDir)
                    .filter(path -> path.toString().endsWith(".java"))
                    .forEach(path -> {
                        // Convert to workspace-relative path
                        String relativePath = path.toString();
                        if (relativePath.startsWith("/workspace/")) {
                            relativePath = relativePath.substring(10); // Remove "/workspace/"
                        }
                        if (!files.contains(relativePath)) {
                            files.add(relativePath);
                        }
                    });
            } catch (IOException e) {
                System.err.println("Warning: Could not walk directory: " + e.getMessage());
            }
        }
        
        // Add pom.xml or build.gradle if present (as relative paths)
        Path workspace = Paths.get("/workspace");
        if (Files.exists(workspace.resolve("pom.xml"))) {
            files.add("pom.xml");
        }
        if (Files.exists(workspace.resolve("build.gradle"))) {
            files.add("build.gradle");
        }
        if (Files.exists(workspace.resolve("build.gradle.kts"))) {
            files.add("build.gradle.kts");
        }
        
        return files;
    }
    
    private static String computeFilesHash(List<String> files) {
        try {
            MessageDigest md = MessageDigest.getInstance("MD5");
            for (String file : files) {
                // Convert to absolute path
                Path filePath;
                if (file.startsWith("/")) {
                    filePath = Paths.get(file);
                } else {
                    filePath = Paths.get("/workspace", file);
                }
                md.update(file.getBytes());
                if (Files.exists(filePath)) {
                    FileTime lastModified = Files.getLastModifiedTime(filePath);
                    long size = Files.size(filePath);
                    md.update(Long.toString(lastModified.toMillis()).getBytes());
                    md.update(Long.toString(size).getBytes());
                } else {
                    md.update("missing".getBytes());
                }
            }
            byte[] digest = md.digest();
            StringBuilder sb = new StringBuilder();
            for (byte b : digest) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            return "error";
        }
    }
    
    private static String extractJsonFromFile(String content, String filePath) {
        // If the file is TypeScript/JavaScript, look for export default
        if (filePath.endsWith(".ts") || filePath.endsWith(".js")) {
            // Look for export default followed by an object
            int exportIndex = content.indexOf("export default");
            if (exportIndex != -1) {
                // Find the start of the object
                int start = content.indexOf("{", exportIndex);
                if (start != -1) {
                    // Find matching braces
                    int braceCount = 0;
                    int end = start;
                    for (int i = start; i < content.length(); i++) {
                        char c = content.charAt(i);
                        if (c == '{') {
                            braceCount++;
                        } else if (c == '}') {
                            braceCount--;
                            if (braceCount == 0) {
                                end = i + 1;
                                break;
                            }
                        }
                    }
                    if (end > start) {
                        return content.substring(start, end);
                    }
                }
            }
            // Also look for module.exports
            int moduleIndex = content.indexOf("module.exports");
            if (moduleIndex != -1) {
                int start = content.indexOf("{", moduleIndex);
                if (start != -1) {
                    int braceCount = 0;
                    int end = start;
                    for (int i = start; i < content.length(); i++) {
                        char c = content.charAt(i);
                        if (c == '{') {
                            braceCount++;
                        } else if (c == '}') {
                            braceCount--;
                            if (braceCount == 0) {
                                end = i + 1;
                                break;
                            }
                        }
                    }
                    if (end > start) {
                        return content.substring(start, end);
                    }
                }
            }
        }
        // If it's a Java file, it might not contain JSON at all
        // In that case, return null
        return null;
    }
    
    private static void createJarFile(String testPath, Path jarPath, JSONObject javaConfig) throws IOException {
        // Try to find the test file
        Path testFilePath = findTestFile(testPath);
        if (testFilePath == null) {
            throw new IOException("Test file not found: " + testPath + 
                " (searched in current directory and /workspace)");
        }
        
        String testFileName = testFilePath.getFileName().toString();
        String testBaseName = testFileName.substring(0, testFileName.lastIndexOf('.'));
        
        // Read the test file to extract package name
        String packageName = extractPackageName(testFilePath);
        String fullyQualifiedClassName = packageName.isEmpty() ? testBaseName : packageName + "." + testBaseName;
        
        // Create a wrapper class that serves as the main entry point
        String wrapperClassName = testBaseName + "Wrapper";
        String wrapperContent = 
            "public class " + wrapperClassName + " {\n" +
            "    public static void main(String[] args) throws Exception {\n" +
            "        // Dynamically load and run the test class\n" +
            "        Class<?> testClass = Class.forName(\"" + fullyQualifiedClassName + "\");\n" +
            "        // Look for a main method\n" +
            "        try {\n" +
            "            java.lang.reflect.Method mainMethod = testClass.getMethod(\"main\", String[].class);\n" +
            "            mainMethod.invoke(null, (Object) args);\n" +
            "        } catch (NoSuchMethodException e) {\n" +
            "            // If no main method, try to instantiate and run test methods\n" +
            "            Object instance = testClass.getDeclaredConstructor().newInstance();\n" +
            "            // Look for methods annotated with @Test or similar\n" +
            "            // For now, just print a message\n" +
            "            System.out.println(\"Test class loaded: \" + testClass.getName());\n" +
            "            System.out.println(\"No main method found. You may need to implement a test runner.\");\n" +
            "        }\n" +
            "    }\n" +
            "}\n";
        
        // Create a manifest with the wrapper as main class
        String manifest = "Manifest-Version: 1.0\n";
        manifest += "Main-Class: " + wrapperClassName + "\n";
        
        // Add classpath if specified in config
        if (javaConfig.has("classpath")) {
            JSONArray classpathArray = javaConfig.getJSONArray("classpath");
            StringBuilder classpathBuilder = new StringBuilder();
            for (int i = 0; i < classpathArray.length(); i++) {
                if (i > 0) classpathBuilder.append(" ");
                classpathBuilder.append(classpathArray.getString(i));
            }
            manifest += "Class-Path: " + classpathBuilder.toString() + "\n";
        }
        
        // Create a temporary directory
        Path tempDir = Files.createTempDirectory("java-builder");
        try {
            // Write manifest
            Path metaInfDir = tempDir.resolve("META-INF");
            Files.createDirectories(metaInfDir);
            Files.write(metaInfDir.resolve("MANIFEST.MF"), manifest.getBytes());
            
            // Copy test file maintaining package structure
            Path testFileInJar;
            if (!packageName.isEmpty()) {
                // Create directory structure for the package
                String packagePath = packageName.replace('.', '/');
                Path packageDir = tempDir.resolve(packagePath);
                Files.createDirectories(packageDir);
                testFileInJar = packageDir.resolve(testFileName);
            } else {
                testFileInJar = tempDir.resolve(testFileName);
            }
            Files.copy(testFilePath, testFileInJar);
            
            // Write wrapper class (no package needed)
            Path wrapperFileInJar = tempDir.resolve(wrapperClassName + ".java");
            Files.write(wrapperFileInJar, wrapperContent.getBytes());
            
            // Check if Gradle has already compiled the classes (should have been done before java_runtime runs)
            Path workspace = Paths.get("/workspace");
            Path buildDir = workspace.resolve("build");
            Path classesDir = buildDir.resolve("classes/java/main");
            Path testClassesDir = buildDir.resolve("classes/java/test");
            
            if (Files.exists(classesDir) && Files.exists(testClassesDir)) {
                System.out.println("  Found compiled classes from Gradle build");
                
                // Copy compiled classes to temp directory for JAR creation
                Path tempClassesDir = tempDir.resolve("classes");
                Files.createDirectories(tempClassesDir);
                
                // Copy main classes
                copyDirectory(classesDir, tempClassesDir);
                
                // Copy test classes
                copyDirectory(testClassesDir, tempClassesDir);
                
                // Clear the temp directory and add compiled classes
                Files.walk(tempDir)
                    .filter(path -> !path.equals(tempDir) && !path.startsWith(tempClassesDir))
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
                
                // Move classes to root of tempDir
                Files.walk(tempClassesDir)
                    .forEach(source -> {
                        try {
                            Path relative = tempClassesDir.relativize(source);
                            Path dest = tempDir.resolve(relative);
                            if (Files.isDirectory(source)) {
                                Files.createDirectories(dest);
                            } else {
                                Files.createDirectories(dest.getParent());
                                Files.copy(source, dest, StandardCopyOption.REPLACE_EXISTING);
                            }
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
                
                // Clean up tempClassesDir
                Files.walk(tempClassesDir)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
            } else {
                System.out.println("  WARNING: Compiled classes not found. Gradle build may have failed or not run.");
                System.out.println("  Falling back to source files for JAR creation.");
                
                // Copy Calculator.java source if it exists
                Path calculatorSource = Paths.get("/workspace/src/java/main/java/com/example/calculator/Calculator.java");
                if (Files.exists(calculatorSource)) {
                    String calculatorPackage = "com.example.calculator";
                    String packagePath = calculatorPackage.replace('.', '/');
                    Path calculatorPackageDir = tempDir.resolve(packagePath);
                    Files.createDirectories(calculatorPackageDir);
                    Path calculatorInTemp = calculatorPackageDir.resolve("Calculator.java");
                    Files.copy(calculatorSource, calculatorInTemp, StandardCopyOption.REPLACE_EXISTING);
                }
            }
            
            // Compile the wrapper class if we have compiled classes from Gradle
            // Build classpath from Gradle's build directory
            Path workspace = Paths.get("/workspace");
            Path buildDir = workspace.resolve("build");
            Path classesDir = buildDir.resolve("classes/java/main");
            Path testClassesDir = buildDir.resolve("classes/java/test");
            
            if (Files.exists(classesDir) && Files.exists(testClassesDir)) {
                // Build classpath
                StringBuilder classpath = new StringBuilder();
                classpath.append(classesDir.toString());
                classpath.append(":");
                classpath.append(testClassesDir.toString());
                
                // Add JARs from /workspace/lib
                Path libDir = Paths.get("/workspace/lib");
                if (Files.exists(libDir) && Files.isDirectory(libDir)) {
                    try (DirectoryStream<Path> jarStream = Files.newDirectoryStream(libDir, "*.jar")) {
                        for (Path jarFile : jarStream) {
                            classpath.append(":").append(jarFile.toString());
                        }
                    } catch (IOException e) {
                        System.err.println("  Warning: Could not list JARs in lib directory: " + e.getMessage());
                    }
                }
                
                // Compile wrapper class
                List<String> compileCommand = Arrays.asList(
                    "javac",
                    "-cp", classpath.toString(),
                    "-d", tempDir.toString(),
                    wrapperFileInJar.toString()
                );
                
                System.out.println("  Compiling wrapper class with classpath: " + classpath);
                ProcessBuilder compilePb = new ProcessBuilder(compileCommand);
                Process compileProcess = compilePb.start();
                int compileExitCode = compileProcess.waitFor();
                if (compileExitCode != 0) {
                    System.err.println("  WARNING: Failed to compile wrapper class");
                    // Continue anyway - the wrapper source will be included in JAR
                } else {
                    System.out.println("  Successfully compiled wrapper class");
                    // Delete the source file since we have the compiled class
                    Files.delete(wrapperFileInJar);
                }
            }
            
            // Create JAR file
            List<String> jarCommand = Arrays.asList(
                "jar", "cfm", jarPath.toString(),
                metaInfDir.resolve("MANIFEST.MF").toString(),
                "-C", tempDir.toString(), "."
            );
            
            ProcessBuilder pb = new ProcessBuilder(jarCommand);
            Process process = pb.start();
            int exitCode;
            try {
                exitCode = process.waitFor();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new IOException("JAR creation interrupted", e);
            }
            
            if (exitCode != 0) {
                throw new IOException("jar command failed with exit code " + exitCode);
            }
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new IOException("Interrupted during JAR creation", e);
        } finally {
            // Clean up
            Files.walk(tempDir)
                .sorted(Comparator.reverseOrder())
                .map(Path::toFile)
                .forEach(File::delete);
        }
    }
    
    private static String extractPackageName(Path javaFile) {
        try {
            String content = new String(Files.readAllBytes(javaFile));
            // Simple regex to find package declaration
            java.util.regex.Pattern pattern = java.util.regex.Pattern.compile("^\\s*package\\s+([^;]+);", java.util.regex.Pattern.MULTILINE);
            java.util.regex.Matcher matcher = pattern.matcher(content);
            if (matcher.find()) {
                return matcher.group(1).trim();
            }
        } catch (IOException e) {
            // Ignore
        }
        return "";
    }
    
    private static void copyDirectory(Path source, Path target) throws IOException {
        Files.walk(source)
            .forEach(sourcePath -> {
                try {
                    Path targetPath = target.resolve(source.relativize(sourcePath));
                    if (Files.isDirectory(sourcePath)) {
                        Files.createDirectories(targetPath);
                    } else {
                        Files.createDirectories(targetPath.getParent());
                        Files.copy(sourcePath, targetPath, StandardCopyOption.REPLACE_EXISTING);
                    }
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            });
    }
    
    private static Path findTestFile(String testPath) {
        // Try the path as given (relative to current directory)
        Path candidate = Paths.get(testPath);
        if (Files.exists(candidate)) {
            System.out.println("  Found test file at: " + candidate.toAbsolutePath());
            return candidate;
        }
        
        // Try relative to /workspace
        candidate = Paths.get("/workspace", testPath);
        if (Files.exists(candidate)) {
            System.out.println("  Found test file at: " + candidate.toAbsolutePath());
            return candidate;
        }
        
        // Not found
        System.err.println("  Could not find test file: " + testPath);
        return null;
    }
}
