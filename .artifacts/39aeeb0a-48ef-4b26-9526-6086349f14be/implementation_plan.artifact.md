# Implementation Plan - Data Layer and Authentication for PayKal (Native Android)

Implement the data models, authentication logic, and login screen for PayKal using Jetpack Compose and Navigation 3. Note: While the request specified Flutter-like paths and packages, this implementation will target the native Android `app` module using Kotlin and modern Android libraries (Compose, Nav 3, M3) as per system instructions.

## Proposed Changes

### Data Layer
Create the data models and mock provider (ViewModel).

#### [NEW] [User.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/data/model/User.kt)
Data class for User.

#### [NEW] [Child.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/data/model/Child.kt)
Data class for Child.

#### [NEW] [Payment.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/data/model/Payment.kt)
Data class for Payment.

#### [NEW] [School.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/data/model/School.kt)
Data class for School.

#### [NEW] [PaymentViewModel.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/ui/viewmodel/PaymentViewModel.kt)
Android ViewModel to manage state, mock authentication, and payment processing (equivalent to `PaymentProvider`).

---

### UI & Navigation
Implement the Login screen and wire up Navigation 3.

#### [NEW] [Routes.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/ui/navigation/Routes.kt)
Serializable navigation keys for `Login` and `Home` screens.

#### [NEW] [LoginScreen.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/ui/screens/LoginScreen.kt)
Jetpack Compose Login Screen with professional Blue/White styling.

#### [MODIFY] [MainActivity.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/MainActivity.kt)
Update to include `NavBackStack` and `NavDisplay` for handling `/login` and `/home` routes.

---

### Resources & Theming

#### [MODIFY] [strings.xml](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/res/values/strings.xml)
Change app name to "PayKal".

#### [MODIFY] [Color.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/ui/theme/Color.kt)
Define professional Blue and White color tokens.

#### [MODIFY] [Theme.kt](file:///C:/Users/User/AndroidStudioProjects/EasyFrais/app/src/main/java/com/example/easyfrais/ui/theme/Theme.kt)
Ensure the theme uses the new Blue-based palette as a fallback for dynamic color.

## Verification Plan

### Automated Tests
- Build the app using `./gradlew :app:assembleDebug` to ensure compilation.

### Manual Verification
- Review the Login Screen `@Preview` for styling and layout.
- Verify navigation from Login to Home upon successful mock login.
