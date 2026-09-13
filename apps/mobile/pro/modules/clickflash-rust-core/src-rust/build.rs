fn main() {
    uniffi::generate_scaffolding("src/clickflash.udl").expect("Building the UDL file failed");
}
