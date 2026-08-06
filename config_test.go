package main

import (
	"net"
	"testing"
)

func TestConfig_validate(t *testing.T) {
	type fields struct {
		Port           int
		BaseAssetsPath string
		SecureKeys     []string
	}
	init := func(opts ...func(f *fields)) fields {
		f := fields{
			Port:           1234,
			BaseAssetsPath: "/path/to/assets",
			SecureKeys:     []string{"secure key"},
		}
		for _, opt := range opts {
			opt(&f)
		}
		return f
	}
	tests := []struct {
		name    string
		fields  fields
		wantErr bool
	}{
		{
			name:    "Success Case 1",
			fields:  init(),
			wantErr: false,
		},
		{
			name: "Bad Port",
			fields: init(func(f *fields) {
				f.Port = -1
			}),
			wantErr: true,
		},
		{
			name: "Empty Assets Path",
			fields: init(func(f *fields) {
				f.BaseAssetsPath = ""
			}),
			wantErr: true,
		},
		{
			name: "Empty Secure Key",
			fields: init(func(f *fields) {
				f.SecureKeys = []string{}
			}),
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			c := &Config{
				Port:           tt.fields.Port,
				BaseAssetsPath: tt.fields.BaseAssetsPath,
				SecureKeys:     tt.fields.SecureKeys,
			}
			if got := c.validate(); tt.wantErr != (got != nil) {
				t.Errorf("Config.validate() = %v, want error? %v", got, tt.wantErr)
			}
		})
	}
}

func TestTrustedProxy_UnmarshalText(t *testing.T) {
	tests := []struct {
		name    string
		text    string
		want    net.IPNet
		wantErr bool
	}{
		{
			name: "Valid CIDR",
			text: "192.168.0.0/16",
			want: net.IPNet{
				IP:   net.ParseIP("192.168.0.0"),
				Mask: net.CIDRMask(16, 32),
			},
			wantErr: false,
		},
		{
			name: "Valid IP",
			text: "127.0.0.1",
			want: net.IPNet{
				IP:   net.ParseIP("127.0.0.1"),
				Mask: net.CIDRMask(32, 32),
			},
			wantErr: false,
		},
		{
			name:    "Invalid IP",
			text:    "invalid",
			wantErr: true,
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			var tp TrustedProxy
			gotErr := tp.UnmarshalText([]byte(tt.text))
			got := tp.IPNet
			if gotErr != nil {
				if !tt.wantErr {
					t.Errorf("UnmarshalText() failed: %v", gotErr)
				}
				return
			}
			if got.String() != tt.want.String() {
				t.Errorf("UnmarshalText() = %v, want %v", got.String(), tt.want.String())
			}
			if tt.wantErr {
				t.Fatal("UnmarshalText() succeeded unexpectedly")
			}
		})
	}
}
